from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.vital_sign import VitalSignResponse


class EncounterStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DRAFT = "draft"


class EncounterBase(BaseModel):
    doctor_name: str | None = Field(default=None, max_length=255, description="Attending physician name")
    chief_complaint: str | None = Field(default=None, description="Primary reason for outpatient visit")
    status: EncounterStatus = Field(default=EncounterStatus.SCHEDULED, description="Status of clinical encounter")


class EncounterCreate(EncounterBase):
    patient_id: str = Field(..., description="Unique human-readable identifier of the patient (e.g. PAT-XXXX)")
    encounter_id: str | None = Field(
        default=None,
        max_length=64,
        description="Optional client-supplied encounter identifier; auto-generated if omitted",
    )
    consultation_date: datetime | None = Field(
        default=None,
        description="Consultation timestamp (defaults to current time if omitted)",
    )


class EncounterResponse(EncounterBase):
    id: int
    encounter_id: str
    patient_id: int
    consultation_date: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EncounterDetailResponse(EncounterResponse):
    vital_signs: list[VitalSignResponse] = Field(default_factory=list, description="Vital signs captured during encounter")

