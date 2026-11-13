from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.clinical_context import BMIMeasurement, VitalMeasurement
from app.schemas.medication_safety import SOAPMedicationSafetyReport


class ClinicalNoteStatus(str, Enum):
    DRAFT = "draft"
    REVIEWED_WITH_EDITS = "reviewed_with_edits"
    APPROVED = "approved"
    REJECTED = "rejected"


class ExtractedItem(BaseModel):
    """Source-grounded clinical statement preserving evidence, negation, and uncertainty."""
    text: str = Field(..., description="Extracted clinical statement or finding")
    source_evidence: Optional[str] = Field(
        default=None,
        description="Verbatim or near-verbatim quote from consultation text providing provenance",
    )
    is_negated: bool = Field(
        default=False,
        description="True if finding was explicitly negated by patient or clinician (e.g. denies, no)",
    )
    uncertainty_qualifier: Optional[str] = Field(
        default=None,
        description="Explicit diagnostic uncertainty qualifier (e.g. suspected, possible, rule out)",
    )


class SubjectiveSection(BaseModel):
    chief_complaint: str = Field(
        ...,
        description="Primary reason for outpatient visit as stated by patient, or '[Not documented]'",
    )
    history_of_present_illness: str = Field(
        ...,
        description="Narrative of symptoms, onset, and duration reported by patient",
    )
    reported_symptoms: List[str] = Field(
        default_factory=list,
        description="Symptoms affirmatively reported by the patient",
    )
    pertinent_negatives: List[str] = Field(
        default_factory=list,
        description="Symptoms explicitly denied by patient (e.g. 'Denies chest pain')",
    )
    evidence: List[ExtractedItem] = Field(
        default_factory=list,
        description="Grounded evidence items supporting the subjective section",
    )


class ObjectiveSection(BaseModel):
    vital_signs_summary: Optional[str] = Field(
        default=None,
        description="Verified vital signs summary from encounter records or consultation observations",
    )
    physical_examination: List[str] = Field(
        default_factory=list,
        description="Clinician-observed physical examination findings",
    )
    investigations_reviewed: List[str] = Field(
        default_factory=list,
        description="Diagnostic lab or imaging reports explicitly documented in consultation",
    )
    evidence: List[ExtractedItem] = Field(
        default_factory=list,
        description="Grounded evidence items supporting the objective section",
    )


class AssessmentSection(BaseModel):
    primary_impression: str = Field(
        ...,
        description="Primary clinical impression or working diagnosis documented by clinician",
    )
    differential_diagnoses: List[str] = Field(
        default_factory=list,
        description="Differential diagnoses preserving uncertainty markers ('Suspected', 'Rule out')",
    )
    chronic_conditions_status: List[str] = Field(
        default_factory=list,
        description="Status of chronic conditions mentioned (e.g., 'Type 2 DM - active comorbidity')",
    )
    evidence: List[ExtractedItem] = Field(
        default_factory=list,
        description="Grounded evidence items supporting the assessment section",
    )


class PlanSection(BaseModel):
    diagnostic_workup: List[str] = Field(
        default_factory=list,
        description="Laboratory tests or investigations explicitly ordered by clinician",
    )
    proposed_medications: List[str] = Field(
        default_factory=list,
        description="Medications, dosages, or formulations documented in plan (advisory, unprescribed)",
    )
    patient_instructions: List[str] = Field(
        default_factory=list,
        description="Non-pharmacological directions, lifestyle and home-care advice",
    )
    red_flag_warnings: List[str] = Field(
        default_factory=list,
        description="Emergency precautions and critical return symptoms",
    )
    follow_up: Optional[str] = Field(
        default=None,
        description="Explicit follow-up schedule or '[Not documented]'",
    )
    evidence: List[ExtractedItem] = Field(
        default_factory=list,
        description="Grounded evidence items supporting the plan section",
    )


class SOAPPatientContext(BaseModel):
    """Structured background patient clinical context and safety alerts.

    Clearly separated from current consultation findings to prevent conflating
    historical records with real-time consultation observations.
    """
    demographics_summary: Optional[str] = Field(
        default=None,
        description="Patient demographic summary (age, gender, preferred language)",
    )
    allergy_status: Optional[str] = Field(
        default=None,
        description="Allergy recording status ('recorded' or 'not_recorded')",
    )
    documented_allergies: List[str] = Field(
        default_factory=list,
        description="Verified documented drug/substance allergies from patient profile",
    )
    patient_reported_allergies: List[str] = Field(
        default_factory=list,
        description="Patient-reported allergies pending clinical verification",
    )
    unverified_allergies: List[str] = Field(
        default_factory=list,
        description="Unverified or historical allergy records",
    )
    active_medications: List[str] = Field(
        default_factory=list,
        description="Active outpatient medications from patient profile",
    )
    historical_or_discontinued_medications: List[str] = Field(
        default_factory=list,
        description="Past or discontinued medications (never treated as active)",
    )
    chronic_conditions: List[str] = Field(
        default_factory=list,
        description="Active chronic comorbidities from medical history",
    )
    past_medical_history: List[str] = Field(
        default_factory=list,
        description="Resolved, historical, or inactive conditions clearly separated from active comorbidities",
    )
    historical_vitals_summary: Optional[str] = Field(
        default=None,
        description="Summary of historical longitudinal vital measurements from previous encounters",
    )
    historical_vitals: List[VitalMeasurement] = Field(
        default_factory=list,
        description="Structured historical vital measurements with timestamps and source encounter IDs",
    )
    bmi: Optional[BMIMeasurement] = Field(
        default=None,
        description="Body Mass Index with source timestamps, concurrency, and temporal discrepancy metadata",
    )
    clinical_alerts: List[str] = Field(
        default_factory=list,
        description="System safety and completeness alerts from context aggregator",
    )
    is_synthetic: bool = Field(
        default=False,
        description="True if record is a synthetic demonstration record",
    )


class SOAPPayload(BaseModel):
    subjective: SubjectiveSection
    objective: ObjectiveSection
    assessment: AssessmentSection
    plan: PlanSection
    patient_context: Optional[SOAPPatientContext] = Field(
        default=None,
        description="Background patient clinical context and safety alerts clearly separated from consultation findings",
    )
    medication_safety: Optional[SOAPMedicationSafetyReport] = Field(
        default=None,
        description="Deterministic medication safety evaluation of proposed therapies in SOAP plan",
    )


class SOAPGenerateRequest(BaseModel):
    consultation_text: str = Field(
        ...,
        min_length=15,
        max_length=50000,
        description="Doctor-patient clinical transcript or dictation text",
    )
    patient_id: Optional[str] = Field(
        default=None,
        description="Optional patient ID (e.g. 'SYN-PAT-001') to enrich clinical context",
    )
    encounter_id: Optional[str] = Field(
        default=None,
        description="Optional encounter ID (e.g. 'SYN-ENC-001-B') to link vitals and check consistency",
    )
    language_code: str = Field(
        default="en",
        description=(
            "Language code of consultation text. Supported for offline mock processing: 'en' and "
            "Latin-script transliterated 'kn'/'hi'. Native Indic script (Kannada / Devanagari) parsing "
            "is not supported by the offline rule engine and requires the upcoming LLM adapter."
        ),
    )


class NoteReviewRequest(BaseModel):
    reviewing_doctor: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Full name or credentials of the reviewing physician",
    )
    action: ClinicalNoteStatus = Field(
        ...,
        description="Review action: 'approved', 'reviewed_with_edits', or 'rejected'",
    )
    edited_soap: Optional[SOAPPayload] = Field(
        default=None,
        description="Physician-edited SOAP payload when action is 'reviewed_with_edits'",
    )
    doctor_comments: Optional[str] = Field(
        default=None,
        description="Clinical review remarks or rationale",
    )


class ClinicalSOAPNoteResponse(BaseModel):
    id: int
    note_id: str
    status: ClinicalNoteStatus
    is_ai_generated: bool
    disclaimer: str
    patient_id: Optional[str]
    encounter_id: Optional[str]
    language_code: str
    consultation_text: str
    soap: SOAPPayload
    unextracted_or_missing: List[str]
    confidence_notes: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewing_doctor: Optional[str]
    doctor_comments: Optional[str]
    edited_soap: Optional[SOAPPayload] = None
    patient_context: Optional[SOAPPatientContext] = None
    medication_safety: Optional[SOAPMedicationSafetyReport] = Field(
        default=None,
        description="Deterministic medication safety evaluation of proposed therapies in SOAP plan",
    )

    model_config = ConfigDict(from_attributes=True)

