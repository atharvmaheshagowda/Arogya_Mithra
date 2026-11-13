from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Encounter(Base):
    """Outpatient clinical encounter / consultation.

    Status must be one of:
    - scheduled
    - in_progress
    - completed
    - cancelled
    - draft
    """

    __tablename__ = "encounters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    encounter_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    patient_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    doctor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    chief_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)
    consultation_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="scheduled",
    )
    is_synthetic: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    patient: Mapped["Patient"] = relationship(
        "Patient",
        back_populates="encounters",
    )
    vital_signs: Mapped[list["VitalSign"]] = relationship(
        "VitalSign",
        back_populates="encounter",
        cascade="all, delete-orphan",
        order_by="VitalSign.recorded_at.desc()",
    )
