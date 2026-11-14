from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ClinicalDocument(Base):
    """Stores uploaded clinical lab reports, diagnostic scans, and medical documents.

    Maintains document metadata, provenance, genuine extracted text, and structured biomarkers.
    Preserves auditability across server restarts without modifying existing patient tables.
    """

    __tablename__ = "clinical_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    patient_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("patients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    encounter_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("encounters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    patient_identifier: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    encounter_identifier: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(64), nullable=False)
    document_type: Mapped[str] = mapped_column(String(64), default="Laboratory Report", nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)

    extraction_status: Mapped[str] = mapped_column(
        String(32), default="EXTRACTION_PENDING", nullable=False, index=True
    )
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_biomarkers: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    ocr_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    disclaimer: Mapped[str] = mapped_column(
        Text,
        default="Automated document parsing for clinical preview. Requires physician verification before EHR commit.",
        nullable=False,
    )

    upload_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

