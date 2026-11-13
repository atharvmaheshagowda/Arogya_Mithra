from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class VitalSign(Base):
    """Clinical vital signs measured during an encounter.

    All numerical measurements preserve units explicitly. Missing measurements
    remain null and are never populated with zero.
    Units:
    - systolic_bp: mmHg
    - diastolic_bp: mmHg
    - pulse_rate: bpm (beats per minute)
    - temperature_celsius: °C
    - spo2_percentage: % (oxygen saturation)
    - respiratory_rate: breaths/min
    - weight_kg: kg
    - height_cm: cm
    """

    __tablename__ = "vital_signs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    encounter_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("encounters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    systolic_bp: Mapped[float | None] = mapped_column(Float, nullable=True)
    diastolic_bp: Mapped[float | None] = mapped_column(Float, nullable=True)
    pulse_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    temperature_celsius: Mapped[float | None] = mapped_column(Float, nullable=True)
    spo2_percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    respiratory_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    encounter: Mapped["Encounter"] = relationship(
        "Encounter",
        back_populates="vital_signs",
    )

