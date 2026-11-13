from pydantic import BaseModel, ConfigDict, Field

from app.services.medication_safety import SafetyStatus


class SafetyCheckRequest(BaseModel):
    proposed_medication: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Name of the medication proposed for the patient (brand, generic, or formulation)",
    )
    explicit_identifier: str | None = Field(
        default=None,
        max_length=128,
        description="Optional trusted catalogue identifier if selected from a curated dropdown",
    )


class SafetyFindingSchema(BaseModel):
    rule_id: str
    category: str
    severity: str
    affected_medication: str
    explanation: str
    evidence: str
    review_required: bool

    model_config = ConfigDict(from_attributes=True)


class SafetyCheckResponse(BaseModel):
    patient_id: str
    proposed_medication: str
    normalized_name: str | None
    normalized_identifier: str | None
    active_ingredients: list[str]
    match_status: str
    overall_status: SafetyStatus
    findings: list[SafetyFindingSchema]
    checks_performed: list[str]
    unresolved_information: list[str]
    timestamp: str
    disclaimer: str

    model_config = ConfigDict(from_attributes=True)

