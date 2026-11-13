from enum import Enum
from pydantic import BaseModel, ConfigDict, Field


class SafetyStatus(str, Enum):
    SAFE = "SAFE"
    WARNING = "WARNING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    UNABLE_TO_VERIFY = "UNABLE_TO_VERIFY"


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


class SOAPMedicationSafetyReport(BaseModel):
    """Consolidated deterministic medication safety evaluation for all proposed therapies in a SOAP plan."""
    overall_status: SafetyStatus = Field(
        ...,
        description="Highest severity status across all proposed medications: WARNING > UNABLE_TO_VERIFY > REVIEW_REQUIRED > SAFE",
    )
    has_warnings: bool = Field(
        default=False,
        description="True if any proposed medication produced WARNING (allergy conflict, severe DDI, duplicate ingredient)",
    )
    has_review_required: bool = Field(
        default=False,
        description="True if any proposed medication produced REVIEW_REQUIRED (unrecorded allergy profile, patient-reported allergy, unverified active med)",
    )
    has_unable_to_verify: bool = Field(
        default=False,
        description="True if any proposed medication could not be verified against the catalogue",
    )
    evaluations: list[SafetyCheckResponse] = Field(
        default_factory=list,
        description="Individual safety evaluations for each proposed medication extracted from the SOAP plan",
    )
    warnings: list[SafetyFindingSchema] = Field(
        default_factory=list,
        description="List of all warning-tier findings across all evaluated proposed medications",
    )
    review_required: list[SafetyFindingSchema] = Field(
        default_factory=list,
        description="List of all review-required findings across all evaluated proposed medications",
    )
    unable_to_verify: list[str] = Field(
        default_factory=list,
        description="Names of proposed medications that could not be verified against the trusted catalogue",
    )
    disclaimer: str = Field(
        default=(
            "Deterministic safety screening is limited to configured rules and active records in Arogya Mithra. "
            "A SAFE result indicates no detected conflict within the supported rule catalogue and does NOT "
            "guarantee absolute medication safety, complete lack of adverse effects, or replace physician clinical judgment."
        ),
        description="Mandatory bounded-rule safety disclaimer",
    )

    model_config = ConfigDict(from_attributes=True)


class DirectInteractionCheckRequest(BaseModel):
    drug_a: str = Field(..., min_length=1, max_length=255, description="First medication name or brand")
    drug_b: str = Field(..., min_length=1, max_length=255, description="Second medication name or brand")


class DirectInteractionCheckResponse(BaseModel):
    matched: bool = Field(..., description="True if a clinical drug-drug interaction rule was triggered")
    title: str = Field(..., description="Clinical title or summary of the interaction mechanism")
    severity: str = Field(default="Info", description="Interaction severity: Critical, High, Moderate, Info, or Safe")
    evidence: str = Field(..., description="Official clinical pharmacopoeia or BNF reference")
    drug_a_normalized: str | None = None
    drug_b_normalized: str | None = None
    interacting_ingredients: list[str] = Field(default_factory=list)



