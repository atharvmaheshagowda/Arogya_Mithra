from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class PatientMedication(Base):
    """Patient medication history and active therapy record.

    Status must be one of:
    - active: Currently taken by the patient
    - historical: Taken in the past, no longer active
    - discontinued: Explicitly stopped by physician
    - unknown: Uncertain or unverified status

    Retention policy: `ondelete="RESTRICT"` prevents accidental deletion
    of medication history when referencing patients or medications.
    """

    __tablename__ = "patient_medications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    medication_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("medications.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="active",
        index=True,
    )
    prescribed_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    discontinued_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    source: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        default="opd_prescription",
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
        back_populates="medications",
    )
    medication: Mapped["Medication"] = relationship(
        "Medication",
        back_populates="patient_medications",
    )

