from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ExtractedBiomarkerSchema(BaseModel):
    test_name: str
    result: str
    unit: str
    reference_range: str
    flag: str  # "normal", "high", "low", "critical", "unflagged"
    confidence: Optional[float] = 100.0
    source_section: str

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    original_filename: str
    file_size_bytes: int
    content_type: str
    document_type: str
    patient_id: Optional[str] = None
    upload_timestamp: datetime
    extraction_status: str = "TEXT_EXTRACTED"
    ocr_confidence: Optional[float] = 100.0
    extracted_biomarkers: List[ExtractedBiomarkerSchema] = Field(default_factory=list)
    storage_path: str
    disclaimer: str = Field(
        default="Automated document parsing for clinical preview. Requires physician verification before EHR commit.",
    )

    model_config = ConfigDict(from_attributes=True)


class DocumentSummaryResponse(BaseModel):
    document_id: str
    filename: str
    original_filename: str
    file_size_bytes: int
    content_type: str
    document_type: str
    patient_id: Optional[str] = None
    upload_timestamp: datetime
    biomarker_count: int
    extraction_status: str = "TEXT_EXTRACTED"
    ocr_confidence: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentDetailResponse(DocumentUploadResponse):
    extracted_text: Optional[str] = None
