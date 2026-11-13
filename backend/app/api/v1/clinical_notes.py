from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.clinical_note import ClinicalSOAPNote
from app.schemas.clinical_note import (
    ClinicalSOAPNoteResponse,
    NoteReviewRequest,
    SOAPGenerateRequest,
    SOAPPayload,
)
from app.services.soap_service import default_soap_service

router = APIRouter(prefix="/clinical-notes", tags=["Clinical SOAP Notes & Documentation"])


def _format_note_response(note: ClinicalSOAPNote) -> ClinicalSOAPNoteResponse:
    return ClinicalSOAPNoteResponse(
        id=note.id,
        note_id=note.note_id,
        status=note.status,
        is_ai_generated=note.is_ai_generated,
        disclaimer=note.disclaimer,
        patient_id=note.patient_identifier,
        encounter_id=note.encounter_identifier,
        language_code=note.language_code,
        consultation_text=note.consultation_text,
        soap=SOAPPayload.model_validate(note.soap_data),
        unextracted_or_missing=note.unextracted_or_missing or [],
        confidence_notes=note.confidence_notes,
        created_at=note.created_at,
        reviewed_at=note.reviewed_at,
        reviewing_doctor=note.reviewing_doctor,
        doctor_comments=note.doctor_comments,
        edited_soap=SOAPPayload.model_validate(note.edited_soap_data) if note.edited_soap_data else None,
    )


@router.post(
    "/generate",
    response_model=ClinicalSOAPNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a clinical SOAP note draft",
    description=(
        "Parses consultation text and optional encounter/patient context into a structured SOAP draft. "
        "Preserves patient negations and diagnostic uncertainty. "
        "Generated notes are unverified DRAFTS requiring physician review before being authoritative. "
        "NOTE: The current deterministic offline adapter processes English and Latin-script transliterations. "
        "Native Indic script (Kannada / Devanagari) comprehension is explicitly reserved for the upcoming LLM adapter."
    ),
)
def generate_clinical_note(
    request: SOAPGenerateRequest,
    db: Session = Depends(get_db),
):
    note = default_soap_service.generate_draft(db, request)
    return _format_note_response(note)


@router.get(
    "/{note_id}",
    response_model=ClinicalSOAPNoteResponse,
    summary="Retrieve a clinical SOAP note by ID",
    description="Fetches an existing clinical SOAP note draft or approved record.",
)
def get_clinical_note(
    note_id: str,
    db: Session = Depends(get_db),
):
    note = default_soap_service.get_by_note_id(db, note_id)
    return _format_note_response(note)


@router.patch(
    "/{note_id}/review",
    response_model=ClinicalSOAPNoteResponse,
    summary="Physician review and sign-off on clinical SOAP note",
    description=(
        "Enables a clinician to review, amend, approve, or reject a generated SOAP note draft. "
        "Enforces status transition rules and preserves both original draft and clinician edits."
    ),
)
def review_clinical_note(
    note_id: str,
    review_req: NoteReviewRequest,
    db: Session = Depends(get_db),
):
    note = default_soap_service.review_note(db, note_id, review_req)
    return _format_note_response(note)

