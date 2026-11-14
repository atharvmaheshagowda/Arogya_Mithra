import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.clinical_document import ClinicalDocument
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.schemas.document import (
    DocumentDetailResponse,
    DocumentSummaryResponse,
    DocumentUploadResponse,
    ExtractedBiomarkerSchema,
)
from app.services.document_extraction import (
    extract_document_content,
    extract_structured_biomarkers,
    validate_document_file,
)

router = APIRouter(prefix="/documents", tags=["Medical Reports & Documents"])

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "uploads",
)


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload clinical document or laboratory report scan",
    description=(
        "Uploads a medical PDF or image scan (max 10MB), validates format/magic bytes, "
        "extracts genuine selectable text or flags unconfigured OCR, extracts structured biomarkers, "
        "and persists the document record in SQLite."
    ),
)
async def upload_clinical_document(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    encounter_id: Optional[str] = Form(None),
    document_type: str = Form("Laboratory Report"),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty.",
        )

    content = await file.read()

    # Validate file size, extension, and magic bytes
    validate_document_file(file.filename, content)

    # Genuine text extraction
    extracted_text, extraction_status, ocr_confidence = extract_document_content(
        content=content,
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
    )

    # Structured biomarker extraction
    biomarkers = extract_structured_biomarkers(
        extracted_text=extracted_text,
        document_type=document_type,
    )

    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    _, ext = os.path.splitext(file.filename.lower())
    saved_filename = f"{doc_id}{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    destination = os.path.join(UPLOAD_DIR, saved_filename)

    with open(destination, "wb") as f:
        f.write(content)

    # Resolve optional patient and encounter foreign keys
    patient_db_id = None
    if patient_id:
        p = db.execute(select(Patient).where(Patient.patient_id == patient_id)).scalar_one_or_none()
        if p:
            patient_db_id = p.id

    encounter_db_id = None
    if encounter_id:
        e = db.execute(select(Encounter).where(Encounter.encounter_id == encounter_id)).scalar_one_or_none()
        if e:
            encounter_db_id = e.id

    doc_record = ClinicalDocument(
        document_id=doc_id,
        patient_id=patient_db_id,
        encounter_id=encounter_db_id,
        patient_identifier=patient_id,
        encounter_identifier=encounter_id,
        filename=saved_filename,
        original_filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        document_type=document_type,
        file_size_bytes=len(content),
        storage_path=destination,
        extraction_status=extraction_status,
        extracted_text=extracted_text,
        extracted_biomarkers=[b.model_dump() for b in biomarkers],
        ocr_confidence=ocr_confidence,
    )

    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    return DocumentUploadResponse(
        document_id=doc_record.document_id,
        filename=doc_record.filename,
        original_filename=doc_record.original_filename,
        file_size_bytes=doc_record.file_size_bytes,
        content_type=doc_record.content_type,
        document_type=doc_record.document_type,
        patient_id=doc_record.patient_identifier,
        upload_timestamp=doc_record.upload_timestamp,
        extraction_status=doc_record.extraction_status,
        ocr_confidence=doc_record.ocr_confidence,
        extracted_biomarkers=biomarkers,
        storage_path=doc_record.storage_path,
        disclaimer=doc_record.disclaimer,
    )


@router.get(
    "",
    response_model=List[DocumentSummaryResponse],
    summary="List uploaded clinical documents",
    description="Retrieves a list of uploaded medical reports and lab scans, optionally filtered by patient ID.",
)
def list_clinical_documents(
    patient_id: Optional[str] = Query(None, description="Optional patient identifier filter"),
    db: Session = Depends(get_db),
):
    stmt = select(ClinicalDocument).order_by(ClinicalDocument.upload_timestamp.desc())
    if patient_id:
        stmt = stmt.where(ClinicalDocument.patient_identifier == patient_id)

    docs = db.execute(stmt).scalars().all()
    results = []
    for doc in docs:
        bms = doc.extracted_biomarkers or []
        results.append(
            DocumentSummaryResponse(
                document_id=doc.document_id,
                filename=doc.filename,
                original_filename=doc.original_filename,
                file_size_bytes=doc.file_size_bytes,
                content_type=doc.content_type,
                document_type=doc.document_type,
                patient_id=doc.patient_identifier,
                upload_timestamp=doc.upload_timestamp,
                biomarker_count=len(bms),
                extraction_status=doc.extraction_status,
                ocr_confidence=doc.ocr_confidence,
            )
        )
    return results


@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Retrieve clinical document details and extraction results",
    description="Retrieves document metadata, full extracted text, and structured clinical biomarkers.",
)
def get_clinical_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(ClinicalDocument).where(ClinicalDocument.document_id == document_id)
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clinical document '{document_id}' not found.",
        )

    bms = [ExtractedBiomarkerSchema.model_validate(b) for b in (doc.extracted_biomarkers or [])]
    return DocumentDetailResponse(
        document_id=doc.document_id,
        filename=doc.filename,
        original_filename=doc.original_filename,
        file_size_bytes=doc.file_size_bytes,
        content_type=doc.content_type,
        document_type=doc.document_type,
        patient_id=doc.patient_identifier,
        upload_timestamp=doc.upload_timestamp,
        extraction_status=doc.extraction_status,
        ocr_confidence=doc.ocr_confidence,
        extracted_biomarkers=bms,
        storage_path=doc.storage_path,
        disclaimer=doc.disclaimer,
        extracted_text=doc.extracted_text,
    )


@router.get(
    "/{document_id}/file",
    summary="Serve the uploaded clinical document file for inline browser viewing",
    description="Streams the original PDF or image binary with inline Content-Disposition for browser preview.",
)
def get_clinical_document_file(
    document_id: str,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(ClinicalDocument).where(ClinicalDocument.document_id == document_id)
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clinical document '{document_id}' not found.",
        )

    if not os.path.exists(doc.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stored document file '{doc.filename}' could not be located on disk.",
        )

    return FileResponse(
        path=doc.storage_path,
        media_type=doc.content_type,
        headers={"Content-Disposition": f'inline; filename="{doc.original_filename}"'},
    )


@router.post(
    "/{document_id}/reprocess",
    response_model=DocumentDetailResponse,
    summary="Reprocess an uploaded document with enhanced text and OCR extraction",
    description="Re-reads the original stored document from disk, extracts text with the latest extraction engine, updates biomarkers, and persists results.",
)
def reprocess_clinical_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    doc = db.execute(
        select(ClinicalDocument).where(ClinicalDocument.document_id == document_id)
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clinical document '{document_id}' not found.",
        )

    if not os.path.exists(doc.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stored document file '{doc.filename}' could not be located on disk.",
        )

    with open(doc.storage_path, "rb") as f:
        content = f.read()

    extracted_text, extraction_status, ocr_confidence = extract_document_content(
        content=content,
        filename=doc.original_filename or doc.filename,
        content_type=doc.content_type,
    )

    biomarkers = extract_structured_biomarkers(
        extracted_text=extracted_text,
        document_type=doc.document_type or "Laboratory Report",
        base_confidence=ocr_confidence,
    )

    doc.extracted_text = extracted_text
    doc.extraction_status = extraction_status
    doc.ocr_confidence = ocr_confidence
    doc.extracted_biomarkers = [b.model_dump() for b in biomarkers]

    db.add(doc)
    db.commit()
    db.refresh(doc)

    return DocumentDetailResponse(
        document_id=doc.document_id,
        filename=doc.filename,
        original_filename=doc.original_filename,
        file_size_bytes=doc.file_size_bytes,
        content_type=doc.content_type,
        document_type=doc.document_type,
        patient_id=doc.patient_identifier,
        upload_timestamp=doc.upload_timestamp,
        extraction_status=doc.extraction_status,
        ocr_confidence=doc.ocr_confidence,
        extracted_biomarkers=biomarkers,
        storage_path=doc.storage_path,
        disclaimer=doc.disclaimer,
        extracted_text=doc.extracted_text,
    )
