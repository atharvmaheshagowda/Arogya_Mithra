import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.clinical_note import ClinicalSOAPNote
from app.models.encounter import Encounter
from app.models.patient import Patient
from app.models.patient_medication import PatientMedication
from app.models.vital_sign import VitalSign
from app.schemas.clinical_note import (
    ClinicalNoteStatus,
    NoteReviewRequest,
    SOAPGenerateRequest,
    SOAPPayload,
)
from app.services.adapters.base import ClinicalNoteAdapter
from app.services.adapters.factory import get_clinical_note_adapter
from app.services.adapters.mock_adapter import DeterministicMockSOAPAdapter
from app.services.clinical_context import (
    ClinicalContextEncounterMismatchError,
    ClinicalContextEncounterNotFoundError,
    aggregate_clinical_context,
)
from app.services.medication_safety import SafetyStatus, evaluate_soap_plan_safety

MANDATORY_DISCLAIMER = (
    "AI-GENERATED CLINICAL DRAFT. Unverified clinical aid for outpatient documentation. "
    "Must be reviewed, verified, and signed by a licensed physician before clinical decisions or dispensing."
)


class SOAPNoteService:
    def __init__(self, adapter: Optional[ClinicalNoteAdapter] = None):
        self.adapter = adapter if adapter is not None else get_clinical_note_adapter()

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

        # 2. Context resolution and validation using Clinical Context Aggregator
        patient_db_id: Optional[int] = None
        encounter_db_id: Optional[int] = None
        patient_identifier: Optional[str] = request.patient_id
        encounter_identifier: Optional[str] = request.encounter_id
        context: Dict[str, Any] = {}

        if request.patient_id:
            try:
                clinical_ctx = aggregate_clinical_context(
                    db=db,
                    patient_id=request.patient_id,
                    requested_encounter_id=request.encounter_id,
                )
            except ClinicalContextEncounterMismatchError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Patient-Encounter mismatch: {str(exc)}",
                )
            except ClinicalContextEncounterNotFoundError as exc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=str(exc),
                )

            if not clinical_ctx:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Patient '{request.patient_id}' not found.",
                )

            # Retrieve internal database IDs for foreign keys
            patient_db_id = db.execute(
                select(Patient.id).where(Patient.patient_id == request.patient_id)
            ).scalar_one_or_none()

            if request.encounter_id:
                encounter_db_id = db.execute(
                    select(Encounter.id).where(Encounter.encounter_id == request.encounter_id)
                ).scalar_one_or_none()

            patient_identifier = clinical_ctx.patient.patient_id
            encounter_identifier = (
                clinical_ctx.reference_encounter.encounter_id
                if clinical_ctx.reference_encounter
                else request.encounter_id
            )

            # Build structured context for adapter
            context["patient_id"] = clinical_ctx.patient.patient_id
            context["patient_name"] = clinical_ctx.patient.full_name
            context["demographics"] = clinical_ctx.patient.model_dump()
            context["encounter_identifier"] = encounter_identifier
            context["is_synthetic"] = clinical_ctx.patient.is_synthetic
            context["data_provenance"] = {
                "is_synthetic": clinical_ctx.patient.is_synthetic,
                "generated_at": str(clinical_ctx.generated_at),
                "source": "clinical_context_aggregator",
            }

            # Allergies
            context["allergies"] = {
                "allergy_status": clinical_ctx.allergies.allergy_status.value,
                "documented": [a.model_dump() for a in clinical_ctx.allergies.documented],
                "patient_reported": [a.model_dump() for a in clinical_ctx.allergies.patient_reported],
                "unverified": [a.model_dump() for a in clinical_ctx.allergies.unverified],
                "total_count": clinical_ctx.allergies.total_count,
            }

            # Medications
            context["medications"] = {
                "active": [m.model_dump() for m in clinical_ctx.medications.active],
                "historical": [m.model_dump() for m in clinical_ctx.medications.historical],
                "discontinued": [m.model_dump() for m in clinical_ctx.medications.discontinued],
                "uncertain": [m.model_dump() for m in clinical_ctx.medications.uncertain],
                "total_count": clinical_ctx.medications.total_count,
            }

            # Medical History - active vs past separation
            context["medical_history_active"] = [
                h.condition for h in clinical_ctx.medical_history.active
            ]
            context["medical_history_past"] = [
                f"{h.condition} ({h.status.value if hasattr(h.status, 'value') else h.status})"
                for h in (
                    clinical_ctx.medical_history.resolved
                    + clinical_ctx.medical_history.historical
                    + clinical_ctx.medical_history.unknown
                )
            ]
            context["medical_history"] = [
                {
                    "condition": h.condition,
                    "status": h.status.value if hasattr(h.status, "value") else str(h.status),
                }
                for h in (
                    clinical_ctx.medical_history.active
                    + clinical_ctx.medical_history.resolved
                    + clinical_ctx.medical_history.historical
                    + clinical_ctx.medical_history.unknown
                )
            ]

            # Vitals: Current Encounter vs Historical Longitudinal Telemetry
            ref_enc = clinical_ctx.reference_encounter
            ref_enc_id = ref_enc.encounter_id if ref_enc else request.encounter_id

            current_vitals_ctx = ref_enc.vital_signs if ref_enc else None

            # Current encounter vitals (used for Objective examination section)
            if current_vitals_ctx and current_vitals_ctx.has_any_measurements:
                context["vital_signs"] = {
                    "systolic_bp": current_vitals_ctx.systolic_bp.value,
                    "diastolic_bp": current_vitals_ctx.diastolic_bp.value,
                    "pulse_rate": current_vitals_ctx.pulse_rate.value,
                    "temperature_celsius": current_vitals_ctx.temperature_celsius.value,
                    "spo2_percentage": current_vitals_ctx.spo2_percentage.value,
                    "respiratory_rate": current_vitals_ctx.respiratory_rate.value,
                    "weight_kg": current_vitals_ctx.weight_kg.value,
                    "height_cm": current_vitals_ctx.height_cm.value,
                }
                # BMI is current ONLY if both height and weight are measured in this encounter
                if (
                    current_vitals_ctx.bmi
                    and current_vitals_ctx.bmi.value is not None
                    and current_vitals_ctx.bmi.is_concurrent is True
                ):
                    context["bmi"] = current_vitals_ctx.bmi.model_dump()
                else:
                    context["bmi"] = None
            else:
                context["vital_signs"] = {}
                context["bmi"] = None

            # Historical vitals extraction from longitudinal latest_vitals
            historical_vitals: List[Dict[str, Any]] = []
            hist_parts: List[str] = []
            metric_names = [
                ("systolic_bp", "BP (systolic)"),
                ("diastolic_bp", "BP (diastolic)"),
                ("pulse_rate", "HR"),
                ("temperature_celsius", "Temp"),
                ("spo2_percentage", "SpO2"),
                ("respiratory_rate", "RR"),
                ("weight_kg", "Weight"),
                ("height_cm", "Height"),
            ]

            for metric_attr, label in metric_names:
                vm = getattr(clinical_ctx.latest_vitals, metric_attr, None)
                if vm and vm.value is not None:
                    # Check if this measurement belongs to a DIFFERENT encounter than current
                    if not ref_enc_id or vm.source_encounter_id != ref_enc_id:
                        historical_vitals.append(vm.model_dump())
                        enc_tag = f" (from {vm.source_encounter_id})" if vm.source_encounter_id else ""
                        hist_parts.append(f"{label}: {vm.value} {vm.unit}{enc_tag}")

            context["historical_vitals"] = historical_vitals
            context["historical_vitals_summary"] = "; ".join(hist_parts) if hist_parts else None

            # BMI provenance: if latest_vitals has BMI and it's not the current encounter's concurrent BMI
            if clinical_ctx.latest_vitals.bmi and clinical_ctx.latest_vitals.bmi.value is not None:
                context["historical_bmi"] = clinical_ctx.latest_vitals.bmi.model_dump()
            else:
                context["historical_bmi"] = None

            # Alerts & Reference Encounter
            context["alerts"] = [a.model_dump() for a in clinical_ctx.alerts]
            context["reference_encounter"] = (
                clinical_ctx.reference_encounter.model_dump()
                if clinical_ctx.reference_encounter
                else None
            )

        elif request.encounter_id:
            # Standalone encounter reference without patient_id
            enc = db.execute(
                select(Encounter)
                .where(Encounter.encounter_id == request.encounter_id)
                .options(selectinload(Encounter.vital_signs), selectinload(Encounter.patient))
            ).scalar_one_or_none()
            if not enc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Encounter '{request.encounter_id}' not found.",
                )
            encounter_db_id = enc.id
            if enc.patient:
                patient_db_id = enc.patient.id
                patient_identifier = enc.patient.patient_id

            context["encounter_identifier"] = enc.encounter_id
            if enc.vital_signs:
                latest_vitals = enc.vital_signs[0]
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
                if (
                    latest_vitals.weight_kg is not None
                    and latest_vitals.height_cm is not None
                    and latest_vitals.height_cm > 0
                    and latest_vitals.weight_kg > 0
                ):
                    h_m = float(latest_vitals.height_cm) / 100.0
                    bmi_val = round(float(latest_vitals.weight_kg) / (h_m ** 2), 2)
                    context["bmi"] = {
                        "value": bmi_val,
                        "unit": "kg/m²",
                        "weight_kg_used": float(latest_vitals.weight_kg),
                        "height_cm_used": float(latest_vitals.height_cm),
                        "weight_recorded_at": latest_vitals.recorded_at,
                        "height_recorded_at": latest_vitals.recorded_at,
                        "is_concurrent": True,
                        "measurement_gap_days": 0,
                        "recorded_at": latest_vitals.recorded_at,
                        "is_derived": True,
                    }
                else:
                    context["bmi"] = None
            else:
                context["vital_signs"] = {}
                context["bmi"] = None

        # 3. Generate SOAP extraction via adapter
        try:
            soap_payload: SOAPPayload = self.adapter.generate_soap_note(request, context)
        except ValueError as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(err),
            )

        # 3b. Evaluate deterministic medication safety on proposed medications (Phase 5B)
        if patient_db_id and soap_payload.plan.proposed_medications:
            patient = db.execute(
                select(Patient)
                .where(Patient.id == patient_db_id)
                .options(
                    selectinload(Patient.allergies),
                    selectinload(Patient.medications).selectinload(PatientMedication.medication),
                )
            ).scalar_one_or_none()
            if patient:
                soap_payload.medication_safety = evaluate_soap_plan_safety(
                    patient=patient,
                    proposed_medications=soap_payload.plan.proposed_medications,
                    db=db,
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
        if context.get("alerts"):
            alert_codes = [a.get("code") if isinstance(a, dict) else str(a) for a in context["alerts"]]
            if alert_codes:
                confidence_text += f" Context alerts flagged: {', '.join(alert_codes)}."
        if soap_payload.medication_safety:
            confidence_text += f" Medication safety evaluation: {soap_payload.medication_safety.overall_status.value}."
            if soap_payload.medication_safety.warnings:
                warn_rules = [w.rule_id for w in soap_payload.medication_safety.warnings]
                confidence_text += f" Safety warnings flagged: {', '.join(warn_rules)}."
            if soap_payload.medication_safety.has_unable_to_verify:
                confidence_text += f" Unverified medications flagged: {', '.join(soap_payload.medication_safety.unable_to_verify)}."

        draft_note = ClinicalSOAPNote(
            note_id=note_id,
            patient_id=patient_db_id,
            encounter_id=encounter_db_id,
            patient_identifier=patient_identifier,
            encounter_identifier=encounter_identifier,
            status=ClinicalNoteStatus.DRAFT.value,
            is_ai_generated=True,
            disclaimer=MANDATORY_DISCLAIMER,
            language_code=request.language_code.lower(),
            consultation_text=request.consultation_text,
            soap_data=soap_payload.model_dump(mode="json"),
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
            if note.patient_id and review_req.edited_soap.plan.proposed_medications:
                patient = db.execute(
                    select(Patient)
                    .where(Patient.id == note.patient_id)
                    .options(
                        selectinload(Patient.allergies),
                        selectinload(Patient.medications).selectinload(PatientMedication.medication),
                    )
                ).scalar_one_or_none()
                if patient:
                    review_req.edited_soap.medication_safety = evaluate_soap_plan_safety(
                        patient=patient,
                        proposed_medications=review_req.edited_soap.plan.proposed_medications,
                        db=db,
                    )
            else:
                review_req.edited_soap.medication_safety = None
            note.edited_soap_data = review_req.edited_soap.model_dump(mode="json")

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
        if context.get("allergies") and context["allergies"].get("allergy_status") == "not_recorded":
            missing.append("Allergy profile not recorded in patient records")
        if soap.medication_safety:
            if soap.medication_safety.has_warnings or soap.medication_safety.overall_status == SafetyStatus.WARNING:
                missing.append("Critical medication safety warnings flagged (requires physician intervention before prescribing)")
            if soap.medication_safety.has_unable_to_verify or soap.medication_safety.overall_status == SafetyStatus.UNABLE_TO_VERIFY:
                missing.append("One or more proposed medications could not be verified against the trusted catalogue")
        return missing


default_soap_service = SOAPNoteService()
