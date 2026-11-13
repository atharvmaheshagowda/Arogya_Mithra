from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ClinicalSOAPNote(Base):
    """Stores draft and approved clinical SOAP notes generated from consultation texts.
    
    Status follows ClinicalNoteStatus:
    - draft: Initial state. Unreviewed AI/mock output.
    - reviewed_with_edits: Physician made amendments before saving.
    - approved: Physician verified and approved the note.
    - rejected: Physician rejected note.
    """

    __tablename__ = "clinical_soap_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    note_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    # Optional foreign keys to existing Patient and Encounter records
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

    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False, index=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    disclaimer: Mapped[str] = mapped_column(Text, nullable=False)
    language_code: Mapped[str] = mapped_column(String(16), default="en", nullable=False)
    consultation_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Structured SOAP JSON
    soap_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    edited_soap_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    unextracted_or_missing: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    confidence_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Physician review tracking (DEMO-ONLY until auth system is implemented)
    reviewing_doctor: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    doctor_comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships (passive view, read-only references)
    patient = relationship("Patient", foreign_keys=[patient_id], lazy="select")
    encounter = relationship("Encounter", foreign_keys=[encounter_id], lazy="select")

