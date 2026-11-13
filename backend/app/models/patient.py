from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Patient(Base):
    """Patient demographic and master record.

    Clinical Data Governance & Source-of-Truth Policy:
    1. `date_of_birth` is preferred as the primary temporal baseline when documented.
    2. `calculated_age` computes real-time age dynamically to prevent stale age drift.
    3. If `age` is independently supplied at intake, it is retained as `age` (intake age),
       provided it does not significantly conflict (>1 yr discrepancy) with `date_of_birth`.
    4. Deletion Protection: Accidental deletion of patients with clinical history is strictly
       restricted. `is_active` supports soft-deletion without destroying legal medical history.
    5. Provenance: `is_synthetic` explicitly distinguishes demonstration records from real data.
    """

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(
        String(64), nullable=True, default="English"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    is_synthetic: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships — Note: Cascading delete is intentionally NOT configured on clinical records
    # to protect encounters, allergies, and medical histories from permanent loss.
    allergies: Mapped[list["Allergy"]] = relationship(
        "Allergy",
        back_populates="patient",
        order_by="Allergy.recorded_at.desc()",
    )
    medical_history: Mapped[list["MedicalHistory"]] = relationship(
        "MedicalHistory",
        back_populates="patient",
        order_by="MedicalHistory.recorded_at.desc()",
    )
    encounters: Mapped[list["Encounter"]] = relationship(
        "Encounter",
        back_populates="patient",
        order_by="Encounter.consultation_date.desc()",
    )
    medications: Mapped[list["PatientMedication"]] = relationship(
        "PatientMedication",
        back_populates="patient",
        order_by="PatientMedication.created_at.desc()",
    )

    @property
    def calculated_age(self) -> int | None:
        """Dynamically computes the current age based on date_of_birth."""
        if self.date_of_birth:
            today = date.today()
            return (
                today.year
                - self.date_of_birth.year
                - (
                    (today.month, today.day)
                    < (self.date_of_birth.month, self.date_of_birth.day)
                )
            )
        return self.age
