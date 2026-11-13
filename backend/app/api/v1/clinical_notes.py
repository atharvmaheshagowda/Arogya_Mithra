from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.clinical_note import ClinicalSOAPNote
from app.schemas.clinical_note import (
    ClinicalSOAPNoteResponse,
    NoteDraftUpdateRequest,
    NoteReviewRequest,
    SOAPGenerateRequest,
    SOAPPayload,
)
from app.services.soap_service import default_soap_service

router = APIRouter(prefix="/clinical-notes", tags=["Clinical SOAP Notes & Documentation"])


def _format_note_response(note: ClinicalSOAPNote) -> ClinicalSOAPNoteResponse:
    soap = SOAPPayload.model_validate(note.soap_data)
    edited_soap = SOAPPayload.model_validate(note.edited_soap_data) if note.edited_soap_data else None
    active_safety = edited_soap.medication_safety if edited_soap is not None else soap.medication_safety
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
        soap=soap,
        unextracted_or_missing=note.unextracted_or_missing or [],
        confidence_notes=note.confidence_notes,
        created_at=note.created_at,
        reviewed_at=note.reviewed_at,
        reviewing_doctor=note.reviewing_doctor,
        doctor_comments=note.doctor_comments,
        edited_soap=edited_soap,
        patient_context=soap.patient_context,
        medication_safety=active_safety,
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


@router.get(
    "",
    response_model=list[ClinicalSOAPNoteResponse],
    summary="List clinical SOAP notes",
    description="Retrieves a list of generated clinical SOAP notes, with optional filtering by status and patient ID.",
)
def list_clinical_notes(
    status_filter: Optional[str] = Query(None, description="Optional status filter: draft, reviewed_with_edits, approved, rejected"),
    patient_id: Optional[str] = Query(None, description="Optional patient identifier filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    notes = default_soap_service.list_notes(
        db, status_filter=status_filter, patient_id=patient_id, skip=skip, limit=limit
    )
    return [_format_note_response(n) for n in notes]


@router.patch(
    "/{note_id}/draft",
    response_model=ClinicalSOAPNoteResponse,
    summary="Save draft amendments to a clinical SOAP note without approving",
    description=(
        "Persists clinician modifications to an unapproved clinical SOAP note draft. "
        "Re-evaluates medication safety on the amended proposed medications and preserves "
        "the draft status until explicit clinician approval."
    ),
)
def update_clinical_note_draft(
    note_id: str,
    draft_req: NoteDraftUpdateRequest,
    db: Session = Depends(get_db),
):
    note = default_soap_service.update_draft(db, note_id, draft_req)
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

