from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field


class AllergyVerificationStatus(str, Enum):
    DOCUMENTED = "documented"
    PATIENT_REPORTED = "patient_reported"
    UNVERIFIED = "unverified"


class AllergyBase(BaseModel):
    substance: str = Field(..., min_length=1, max_length=255, description="Allergen or substance name")
    reaction: str | None = Field(default=None, max_length=255, description="Observed or reported allergic manifestation")
    severity: str | None = Field(default=None, max_length=64, description="Severity e.g., mild, moderate, severe")
    verification_status: AllergyVerificationStatus = Field(
        default=AllergyVerificationStatus.UNVERIFIED,
        description="Verification state of allergy record",
    )


class AllergyCreate(AllergyBase):
    pass


class AllergyResponse(AllergyBase):
    id: int
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

