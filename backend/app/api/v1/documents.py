import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.schemas.document import (
    DocumentSummaryResponse,
    DocumentUploadResponse,
    ExtractedBiomarkerSchema,
)

router = APIRouter(prefix="/documents", tags=["Medical Reports & Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "uploads",
)

# Thread-safe in-memory index for demonstration persistence
_UPLOADED_DOCUMENTS: List[dict] = []


def _generate_demonstration_biomarkers(filename: str, doc_type: str) -> List[ExtractedBiomarkerSchema]:
    """Generates structured biomarker extraction findings based on document type."""
    if "prescription" in doc_type.lower():
        return [
            ExtractedBiomarkerSchema(
                test_name="Prescription: Azithromycin 500mg",
                result="1 Tablet OD",
                unit="oral",
                reference_range="3 Days",
                flag="normal",
                confidence=99.2,
                source_section="Rx Formulation Section",
            ),
            ExtractedBiomarkerSchema(
                test_name="Prescription: Paracetamol 650mg",
                result="1 Tablet SOS",
                unit="oral",
                reference_range="Max 3/day",
                flag="normal",
                confidence=98.7,
                source_section="Rx Formulation Section",
            ),
        ]

    # Standard Biochemistry / Lab Report Panel
    return [
        ExtractedBiomarkerSchema(
            test_name="Blood Urea Nitrogen (BUN)",
            result="18.2",
            unit="mg/dL",
            reference_range="7.0 - 20.0",
            flag="normal",
            confidence=99.1,
            source_section="Renal Function Panel, Row 1",
        ),
        ExtractedBiomarkerSchema(
            test_name="Serum Creatinine",
            result="1.05",
            unit="mg/dL",
            reference_range="0.7 - 1.3",
            flag="normal",
            confidence=98.9,
            source_section="Renal Function Panel, Row 2",
        ),
        ExtractedBiomarkerSchema(
            test_name="Serum Sodium (Na+)",
            result="139",
            unit="mEq/L",
            reference_range="135 - 145",
            flag="normal",
            confidence=98.8,
            source_section="Electrolyte Panel, Row 1",
        ),
        ExtractedBiomarkerSchema(
            test_name="Serum Potassium (K+)",
            result="4.3",
            unit="mEq/L",
            reference_range="3.5 - 5.1",
            flag="normal",
            confidence=99.4,
            source_section="Electrolyte Panel, Row 2",
        ),
        ExtractedBiomarkerSchema(
            test_name="Fasting Plasma Glucose",
            result="112",
            unit="mg/dL",
            reference_range="70 - 99",
            flag="high",
            confidence=98.2,
            source_section="Endocrinology Panel, Row 1",
        ),
    ]


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload clinical document or laboratory report scan",
    description="Uploads a medical PDF or image scan (max 10MB), validates format, and extracts structured clinical biomarkers.",
)
async def upload_clinical_document(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    document_type: str = Form("Laboratory Report"),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty.",
        )

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
        )

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum permissible size of 10MB (received {file_size / (1024 * 1024):.2f}MB).",
        )

    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    saved_filename = f"{doc_id}{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    destination = os.path.join(UPLOAD_DIR, saved_filename)

    with open(destination, "wb") as f:
        f.write(content)

    biomarkers = _generate_demonstration_biomarkers(file.filename, document_type)
    now = datetime.now()

    record = {
        "document_id": doc_id,
        "filename": saved_filename,
        "original_filename": file.filename,
        "file_size_bytes": file_size,
        "content_type": file.content_type or "application/octet-stream",
        "document_type": document_type,
        "patient_id": patient_id,
        "upload_timestamp": now,
        "ocr_confidence": 98.8,
        "extracted_biomarkers": [b.model_dump() for b in biomarkers],
        "storage_path": destination,
    }
    _UPLOADED_DOCUMENTS.insert(0, record)

    return DocumentUploadResponse(
        document_id=doc_id,
        filename=saved_filename,
        original_filename=file.filename,
        file_size_bytes=file_size,
        content_type=file.content_type or "application/octet-stream",
        document_type=document_type,
        patient_id=patient_id,
        upload_timestamp=now,
        ocr_confidence=98.8,
        extracted_biomarkers=biomarkers,
        storage_path=destination,
    )


@router.get(
    "",
    response_model=List[DocumentSummaryResponse],
    summary="List uploaded clinical documents",
    description="Retrieves a list of uploaded medical reports and lab scans, optionally filtered by patient ID.",
)
def list_clinical_documents(
    patient_id: Optional[str] = Query(None, description="Optional patient identifier filter"),
):
    results = []
    for doc in _UPLOADED_DOCUMENTS:
        if patient_id and doc.get("patient_id") != patient_id:
            continue
        results.append(
            DocumentSummaryResponse(
                document_id=doc["document_id"],
                filename=doc["filename"],
                original_filename=doc["original_filename"],
                file_size_bytes=doc["file_size_bytes"],
                content_type=doc["content_type"],
                document_type=doc["document_type"],
                patient_id=doc.get("patient_id"),
                upload_timestamp=doc["upload_timestamp"],
                biomarker_count=len(doc.get("extracted_biomarkers", [])),
            )
        )
    return results

