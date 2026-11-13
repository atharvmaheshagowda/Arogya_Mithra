from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field


class MedicalHistoryStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    HISTORICAL = "historical"
    UNKNOWN = "unknown"


class MedicalHistoryBase(BaseModel):
    condition: str = Field(..., min_length=1, max_length=255, description="Medical condition or diagnosis name")
    description: str | None = Field(default=None, description="Detailed notes, symptoms or clinical context")
    status: MedicalHistoryStatus = Field(
        default=MedicalHistoryStatus.UNKNOWN,
        description="Clinical status of the condition",
    )
    onset_date: date | None = Field(default=None, description="Date condition started or was first identified")
    source: str | None = Field(
        default=None,
        max_length=128,
        description="Origin of information e.g. patient_reported, past_records, physician_documented",
    )


class MedicalHistoryCreate(MedicalHistoryBase):
    pass


class MedicalHistoryResponse(MedicalHistoryBase):
    id: int
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

