from datetime import datetime
from sqlalchemy import JSON, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Medication(Base):
    """Medication master catalogue item.

    Stores normalized generic identity, active ingredients, and brand aliases.
    Ingredient normalization prevents reliance solely on brand names or fuzzy guessing.
    """

    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    medication_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    generic_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    brand_name: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    active_ingredients: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    strength: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dosage_form: Mapped[str | None] = mapped_column(String(64), nullable=True)
    normalized_identifier: Mapped[str] = mapped_column(
        String(128), index=True, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    patient_medications: Mapped[list["PatientMedication"]] = relationship(
        "PatientMedication",
        back_populates="medication",
    )

