from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class VitalSignBase(BaseModel):
    systolic_bp: float | None = Field(
        default=None,
        ge=30.0,
        le=300.0,
        description="Systolic blood pressure in mmHg (range: 30-300)",
    )
    diastolic_bp: float | None = Field(
        default=None,
        ge=20.0,
        le=200.0,
        description="Diastolic blood pressure in mmHg (range: 20-200)",
    )
    pulse_rate: int | None = Field(
        default=None,
        ge=20,
        le=300,
        description="Heart/pulse rate in beats per minute (bpm, range: 20-300)",
    )
    temperature_celsius: float | None = Field(
        default=None,
        ge=25.0,
        le=45.0,
        description="Body temperature in Celsius (°C, range: 25.0-45.0)",
    )
    spo2_percentage: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Blood oxygen saturation percentage (%, range: 0-100)",
    )
    respiratory_rate: int | None = Field(
        default=None,
        ge=4,
        le=100,
        description="Respiratory rate in breaths per minute (range: 4-100)",
    )
    weight_kg: float | None = Field(
        default=None,
        ge=0.5,
        le=500.0,
        description="Body weight in kilograms (kg, range: 0.5-500.0)",
    )
    height_cm: float | None = Field(
        default=None,
        ge=20.0,
        le=300.0,
        description="Body height in centimeters (cm, range: 20.0-300.0)",
    )


class VitalSignCreate(VitalSignBase):
    pass


class VitalSignResponse(VitalSignBase):
    id: int
    encounter_id: int
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

