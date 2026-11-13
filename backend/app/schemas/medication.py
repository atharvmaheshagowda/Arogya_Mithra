from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class MedicationBase(BaseModel):
    generic_name: str = Field(..., min_length=1, max_length=255, description="Official generic chemical or INN name")
    brand_name: str | None = Field(default=None, max_length=255, description="Commercial brand name alias")
    active_ingredients: list[str] = Field(
        ...,
        min_length=1,
        description="Explicit list of active pharmacological molecules / ingredients",
    )
    strength: str | None = Field(default=None, max_length=64, description="Dosage strength (e.g. '500 mg')")
    dosage_form: str | None = Field(default=None, max_length=64, description="Dosage form (e.g. 'tablet', 'syrup')")
    normalized_identifier: str | None = Field(
        default=None,
        max_length=128,
        description="Normalized lowercase key (e.g. 'paracetamol'). Auto-derived if omitted.",
    )
    is_active: bool = Field(default=True, description="Whether this catalogue entry is active")


class MedicationCreate(MedicationBase):
    medication_id: str | None = Field(
        default=None,
        max_length=64,
        description="Unique identifier for catalogue item (auto-derived if omitted)",
    )


class MedicationResponse(MedicationBase):
    id: int
    medication_id: str
    normalized_identifier: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

