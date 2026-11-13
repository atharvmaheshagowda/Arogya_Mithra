import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.clinical_note import ClinicalSOAPNote
from app.models.encounter import Encounter
from app.models.patient import Patient
from app.models.vital_sign import VitalSign
from app.schemas.clinical_note import (
    ClinicalNoteStatus,
    NoteReviewRequest,
    SOAPGenerateRequest,
    SOAPPayload,
)
from app.services.adapters.base import ClinicalNoteAdapter
from app.services.adapters.mock_adapter import DeterministicMockSOAPAdapter

MANDATORY_DISCLAIMER = (
    "AI-GENERATED CLINICAL DRAFT. Unverified clinical aid for outpatient documentation. "
    "Must be reviewed, verified, and signed by a licensed physician before clinical decisions or dispensing."
)


class SOAPNoteService:
    def __init__(self, adapter: Optional[ClinicalNoteAdapter] = None):
        self.adapter = adapter or DeterministicMockSOAPAdapter()

    def generate_draft(self, db: Session, request: SOAPGenerateRequest) -> ClinicalSOAPNote:
        # 1. Validate language code
        if request.language_code.lower() not in DeterministicMockSOAPAdapter.SUPPORTED_LANGUAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Unsupported language code '{request.language_code}'. "
                    f"Supported languages: {', '.join(sorted(DeterministicMockSOAPAdapter.SUPPORTED_LANGUAGES))}"
                ),
            )

        # 2. Context resolution and validation against existing database records
        patient_record: Optional[Patient] = None
        encounter_record: Optional[Encounter] = None
        context: Dict[str, Any] = {}

        if request.patient_id:
            patient_record = db.execute(
                select(Patient)
                .where(Patient.patient_id == request.patient_id)
                .options(selectinload(Patient.medical_history))
            ).scalar_one_or_none()
            if not patient_record:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Patient '{request.patient_id}' not found.",
                )
            context["patient_name"] = patient_record.full_name
            context["medical_history"] = [
                {"condition": h.condition, "status": h.status}
                for h in patient_record.medical_history
            ]

        if request.encounter_id:
            encounter_record = db.execute(
                select(Encounter)
                .where(Encounter.encounter_id == request.encounter_id)
                .options(selectinload(Encounter.vital_signs), selectinload(Encounter.patient))
            ).scalar_one_or_none()
            if not encounter_record:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Encounter '{request.encounter_id}' not found.",
                )

            # Validate patient-encounter consistency
            if patient_record and encounter_record.patient_id != patient_record.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Patient-Encounter mismatch: Encounter '{request.encounter_id}' belongs to "
                        f"patient ID '{encounter_record.patient.patient_id}', not '{request.patient_id}'."
                    ),
                )

            context["encounter_identifier"] = encounter_record.encounter_id
            if encounter_record.vital_signs:
                latest_vitals: VitalSign = encounter_record.vital_signs[0]
                context["vital_signs"] = {
                    "systolic_bp": latest_vitals.systolic_bp,
                    "diastolic_bp": latest_vitals.diastolic_bp,
                    "pulse_rate": latest_vitals.pulse_rate,
                    "temperature_celsius": latest_vitals.temperature_celsius,
                    "spo2_percentage": latest_vitals.spo2_percentage,
                    "respiratory_rate": latest_vitals.respiratory_rate,
                    "weight_kg": latest_vitals.weight_kg,
                    "height_cm": latest_vitals.height_cm,
                }

        # 3. Generate SOAP extraction via adapter
        try:
            soap_payload: SOAPPayload = self.adapter.generate_soap_note(request, context)
        except ValueError as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(err),
            )

        # 4. Assess unextracted or missing domains for clinical safety
        unextracted = self._identify_missing_domains(soap_payload, context)

        # 5. Build and persist draft note
        prefix = request.encounter_id or request.patient_id or "GEN"
        note_id = f"NOTE-{prefix}-{uuid.uuid4().hex[:6].upper()}"

        confidence_text = (
            "Deterministic rule-based draft extraction. Requires licensed physician verification before clinical sign-off."
        )
        if request.language_code.lower() in ["kn", "hi"]:
            confidence_text += (
                f" Note: Language code tagged as '{request.language_code}' (Latin-script/transliteration). "
                "The deterministic adapter applies English/Latin clinical heuristics; native Indic grammatical comprehension is deferred to the LLM adapter."
            )

        draft_note = ClinicalSOAPNote(
            note_id=note_id,
            patient_id=patient_record.id if patient_record else None,
            encounter_id=encounter_record.id if encounter_record else None,
            patient_identifier=patient_record.patient_id if patient_record else request.patient_id,
            encounter_identifier=encounter_record.encounter_id if encounter_record else request.encounter_id,
            status=ClinicalNoteStatus.DRAFT.value,
            is_ai_generated=True,
            disclaimer=MANDATORY_DISCLAIMER,
            language_code=request.language_code.lower(),
            consultation_text=request.consultation_text,
            soap_data=soap_payload.model_dump(),
            edited_soap_data=None,
            unextracted_or_missing=unextracted,
            confidence_notes=confidence_text,
            reviewing_doctor=None,
            doctor_comments=None,
        )

        db.add(draft_note)
        db.commit()
        db.refresh(draft_note)
        return draft_note

    def get_by_note_id(self, db: Session, note_id: str) -> ClinicalSOAPNote:
        note = db.execute(
            select(ClinicalSOAPNote).where(ClinicalSOAPNote.note_id == note_id)
        ).scalar_one_or_none()
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clinical note '{note_id}' not found.",
            )
        return note

    def review_note(
        self,
        db: Session,
        note_id: str,
        review_req: NoteReviewRequest,
    ) -> ClinicalSOAPNote:
        note = self.get_by_note_id(db, note_id)

        # Validate status transitions
        if note.status == ClinicalNoteStatus.REJECTED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Clinical note '{note_id}' was previously rejected. Rejected notes cannot be approved; generate a new draft.",
            )

        if note.status == ClinicalNoteStatus.APPROVED.value and review_req.action == ClinicalNoteStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Clinical note '{note_id}' has already been officially approved.",
            )

        if review_req.action not in [
            ClinicalNoteStatus.APPROVED,
            ClinicalNoteStatus.REVIEWED_WITH_EDITS,
            ClinicalNoteStatus.REJECTED,
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid review action '{review_req.action}'.",
            )

        # Require edited_soap payload if reviewed_with_edits
        if review_req.action == ClinicalNoteStatus.REVIEWED_WITH_EDITS and not review_req.edited_soap:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Action 'reviewed_with_edits' requires an 'edited_soap' payload containing the modified sections.",
            )

        note.status = review_req.action.value
        note.reviewing_doctor = review_req.reviewing_doctor.strip()
        note.reviewed_at = datetime.now()
        note.doctor_comments = review_req.doctor_comments

        if review_req.edited_soap:
            note.edited_soap_data = review_req.edited_soap.model_dump()

        db.commit()
        db.refresh(note)
        return note

    def _identify_missing_domains(
        self, soap: SOAPPayload, context: Dict[str, Any]
    ) -> List[str]:
        missing = []
        if not soap.objective.vital_signs_summary:
            missing.append("Vital signs not documented or unavailable")
        if not soap.objective.investigations_reviewed:
            missing.append("Diagnostic investigations / laboratory reports not reviewed")
        if not soap.plan.diagnostic_workup:
            missing.append("No laboratory or diagnostic tests ordered")
        if not soap.plan.proposed_medications:
            missing.append("No pharmacological therapies documented in consultation plan")
        if soap.plan.follow_up == "[Follow-up schedule not documented]":
            missing.append("Follow-up review schedule not documented")
        return missing


default_soap_service = SOAPNoteService()
