from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.allergy import AllergyResponse
from app.schemas.medical_history import MedicalHistoryResponse
from app.schemas.patient_medication import PatientMedicationResponse


class AllergyRecordingStatus(str, Enum):
    RECORDED = "recorded"
    NOT_RECORDED = "not_recorded"


class DemographicContext(BaseModel):
    patient_id: str
    full_name: str
    calculated_age: int | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    preferred_language: str | None = "English"
    phone_number: str | None = None
    is_active: bool = True
    is_synthetic: bool = False

    model_config = ConfigDict(from_attributes=True)


class AllergyContext(BaseModel):
    allergy_status: AllergyRecordingStatus = Field(
        ...,
        description="Explicit recording status: 'recorded' or 'not_recorded'. Note: empty does NOT mean NKDA.",
    )
    documented: list[AllergyResponse] = Field(default_factory=list)
    patient_reported: list[AllergyResponse] = Field(default_factory=list)
    unverified: list[AllergyResponse] = Field(default_factory=list)
    total_count: int = 0


class MedicalHistoryContext(BaseModel):
    active: list[MedicalHistoryResponse] = Field(default_factory=list)
    resolved: list[MedicalHistoryResponse] = Field(default_factory=list)
    historical: list[MedicalHistoryResponse] = Field(default_factory=list)
    unknown: list[MedicalHistoryResponse] = Field(default_factory=list)
    total_count: int = 0


class MedicationContext(BaseModel):
    active: list[PatientMedicationResponse] = Field(default_factory=list)
    historical: list[PatientMedicationResponse] = Field(default_factory=list)
    discontinued: list[PatientMedicationResponse] = Field(default_factory=list)
    uncertain: list[PatientMedicationResponse] = Field(default_factory=list)
    total_count: int = 0


class VitalMeasurement(BaseModel):
    value: float | int | None = None
    unit: str
    recorded_at: datetime | None = None
    source_encounter_id: str | None = None


class BMIMeasurement(BaseModel):
    value: float | None = None
    unit: str = "kg/m²"
    weight_kg_used: float | None = None
    height_cm_used: float | None = None
    weight_recorded_at: datetime | None = None
    height_recorded_at: datetime | None = None
    measurement_gap_days: int | None = None
    is_concurrent: bool | None = None
    recorded_at: datetime | None = None
    is_derived: bool = True
    disclaimer: str = (
        "Body Mass Index (BMI) is a mathematically derived parameter for clinical reference only. "
        "It does not constitute an independent diagnostic finding or assessment of nutritional/cardiovascular pathology."
    )


class LatestVitalsContext(BaseModel):
    systolic_bp: VitalMeasurement = Field(default_factory=lambda: VitalMeasurement(unit="mmHg"))
    diastolic_bp: VitalMeasurement = Field(default_factory=lambda: VitalMeasurement(unit="mmHg"))
    pulse_rate: VitalMeasurement = Field(default_factory=lambda: VitalMeasurement(unit="bpm"))
    temperature_celsius: VitalMeasurement = Field(default_factory=lambda: VitalMeasurement(unit="°C"))
    spo2_percentage: VitalMeasurement = Field(default_factory=lambda: VitalMeasurement(unit="%"))
    respiratory_rate: VitalMeasurement = Field(default_factory=lambda: VitalMeasurement(unit="breaths/min"))
    weight_kg: VitalMeasurement = Field(default_factory=lambda: VitalMeasurement(unit="kg"))
    height_cm: VitalMeasurement = Field(default_factory=lambda: VitalMeasurement(unit="cm"))
    bmi: BMIMeasurement = Field(default_factory=BMIMeasurement)
    has_any_measurements: bool = False


class ReferenceEncounterContext(BaseModel):
    encounter_id: str
    consultation_date: datetime
    doctor_name: str | None = None
    chief_complaint: str | None = None
    status: str
    is_synthetic: bool = False
    is_explicitly_requested: bool = False
    notice: str = (
        "Reference encounter represents the consultation context selected for this evaluation. "
        "Historical encounters are not automatically assumed to be the active consultation."
    )


class EncounterTimelineItem(BaseModel):
    encounter_id: str
    consultation_date: datetime
    doctor_name: str | None = None
    chief_complaint: str | None = None
    status: str
    is_synthetic: bool = False


class ClinicalAlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ClinicalAlert(BaseModel):
    code: str
    severity: ClinicalAlertSeverity
    message: str
    category: str


class ClinicalContextResponse(BaseModel):
    patient: DemographicContext
    allergies: AllergyContext
    medical_history: MedicalHistoryContext
    medications: MedicationContext
    reference_encounter: ReferenceEncounterContext | None = None
    latest_vitals: LatestVitalsContext
    encounter_timeline: list[EncounterTimelineItem] = Field(default_factory=list)
    alerts: list[ClinicalAlert] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.now)
    disclaimer: str = (
        "Consolidated clinical context is aggregated deterministically from patient medical records in Arogya Mithra. "
        "It assists outpatient clinical evaluation but does not replace comprehensive physician chart review or clinical judgment."
    )

    model_config = ConfigDict(from_attributes=True)

