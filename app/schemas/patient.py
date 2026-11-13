from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.allergy import AllergyCreate, AllergyResponse
from app.schemas.medical_history import MedicalHistoryCreate, MedicalHistoryResponse


class PatientBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255, description="Full legal or reported patient name")
    date_of_birth: date | None = Field(default=None, description="Date of birth (preferred source of truth for age)")
    age: int | None = Field(
        default=None,
        ge=0,
        le=130,
        description="Patient age in years (non-negative, clinically plausible <= 130)",
    )
    gender: str | None = Field(default=None, max_length=32, description="Self-reported or documented gender")
    phone_number: str | None = Field(default=None, max_length=32, description="Contact phone number")
    preferred_language: str | None = Field(
        default="English",
        max_length=64,
        description="Preferred language for OPD interaction (e.g., Kannada, Hindi, English)",
    )
    is_synthetic: bool = Field(
        default=False,
        description="Explicit provenance marker indicating synthetic/demonstration record",
    )

    @model_validator(mode="after")
    def validate_demographic_source_of_truth(self) -> "PatientBase":
        """Enforces clinical demographic source-of-truth policy:

        1. Rejects future dates of birth.
        2. When date_of_birth is provided, checks consistency with independently supplied age.
        3. If age is omitted but date_of_birth is present, computes age automatically.
        4. Rejects conflicting age/DOB pairs when discrepancy exceeds 1 year.
        """
        if self.date_of_birth:
            today = date.today()
            if self.date_of_birth > today:
                raise ValueError("Date of birth cannot be in the future.")

            computed_age = (
                today.year
                - self.date_of_birth.year
                - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
            )

            if self.age is not None:
                # Discrepancy > 1 year indicates irreconcilable clinical conflict
                if abs(computed_age - self.age) > 1:
                    raise ValueError(
                        f"Provided age ({self.age}) significantly conflicts with date of birth "
                        f"({self.date_of_birth}, calculated age: {computed_age})."
                    )
            else:
                self.age = computed_age

        return self


class PatientCreate(PatientBase):
    patient_id: str | None = Field(
        default=None,
        max_length=64,
        description="Optional unique patient identifier; auto-generated (e.g. PAT-YYYYMMDD-XXXX) if omitted",
    )
    allergies: list[AllergyCreate] = Field(
        default_factory=list,
        description="Optional initial allergies to record at registration",
    )
    medical_history: list[MedicalHistoryCreate] = Field(
        default_factory=list,
        description="Optional initial medical history conditions to record at registration",
    )


class PatientResponse(PatientBase):
    patient_id: str
    is_active: bool = True
    calculated_age: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientDetailResponse(PatientResponse):
    allergies: list[AllergyResponse] = Field(default_factory=list, description="Documented or reported allergies")
    medical_history: list[MedicalHistoryResponse] = Field(
        default_factory=list,
        description="Past and active medical conditions",
    )
