from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.medication import MedicationResponse


class MedicationStatus(str, Enum):
    ACTIVE = "active"
    HISTORICAL = "historical"
    DISCONTINUED = "discontinued"
    UNKNOWN = "unknown"


class PatientMedicationCreate(BaseModel):
    medication_id: str = Field(
        ...,
        description="Medication identifier or catalogue ID to prescribe or record",
    )
    status: MedicationStatus = Field(
        default=MedicationStatus.ACTIVE,
        description="Status of medication therapy (active, historical, discontinued, unknown)",
    )
    prescribed_date: datetime | None = Field(
        default=None,
        description="Date/time medication was initiated (defaults to current time if omitted)",
    )
    discontinued_date: datetime | None = Field(
        default=None,
        description="Date/time medication was stopped (if status is discontinued or historical)",
    )
    source: str = Field(
        default="opd_prescription",
        max_length=128,
        description="Clinical origin of record (e.g. 'opd_prescription', 'patient_reported', 'past_records')",
    )
    is_synthetic: bool = Field(
        default=False,
        description="Provenance flag indicating whether this is demonstration data",
    )


class PatientMedicationResponse(BaseModel):
    id: int
    patient_id: int
    medication_id: int
    status: MedicationStatus
    prescribed_date: datetime
    discontinued_date: datetime | None
    source: str
    is_synthetic: bool
    created_at: datetime
    medication: MedicationResponse | None = None

    model_config = ConfigDict(from_attributes=True)

