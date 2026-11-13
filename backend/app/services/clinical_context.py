from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.encounter import Encounter
from app.models.patient import Patient
from app.models.patient_medication import PatientMedication
from app.models.vital_sign import VitalSign
from app.schemas.allergy import AllergyResponse
from app.schemas.clinical_context import (
    AllergyContext,
    AllergyRecordingStatus,
    BMIMeasurement,
    ClinicalAlert,
    ClinicalAlertSeverity,
    ClinicalContextResponse,
    DemographicContext,
    EncounterTimelineItem,
    LatestVitalsContext,
    MedicalHistoryContext,
    MedicationContext,
    ReferenceEncounterContext,
    VitalMeasurement,
)
from app.schemas.medical_history import MedicalHistoryResponse
from app.schemas.patient_medication import PatientMedicationResponse


class ClinicalContextEncounterMismatchError(Exception):
    """Raised when a requested encounter_id does not belong to the target patient."""
    pass


class ClinicalContextEncounterNotFoundError(Exception):
    """Raised when a requested encounter_id does not exist."""
    pass


# Engineering threshold for data quality warning on temporal gap between height & weight (not a clinical guideline)
DEFAULT_BMI_TIME_GAP_THRESHOLD_DAYS: int = 365


def aggregate_clinical_context(
    db: Session,
    patient_id: str,
    requested_encounter_id: str | None = None,
    bmi_time_gap_threshold_days: int = DEFAULT_BMI_TIME_GAP_THRESHOLD_DAYS,
) -> ClinicalContextResponse | None:
    """Aggregates and structures a patient's complete clinical context deterministically.

    Eager loading via batch SELECT queries (selectinload) loads the patient and related
    collections (allergies, medical history, encounters with vital signs, medications)
    across batch queries, avoiding N+1 query patterns.
    """
    # 1. Fetch patient with all clinical relationships preloaded
    stmt = (
        select(Patient)
        .where(Patient.patient_id == patient_id)
        .options(
            selectinload(Patient.allergies),
            selectinload(Patient.medical_history),
            selectinload(Patient.encounters).selectinload(Encounter.vital_signs),
            selectinload(Patient.medications).selectinload(PatientMedication.medication),
        )
    )
    patient = db.execute(stmt).scalar_one_or_none()
    if not patient:
        return None

    alerts: list[ClinicalAlert] = []

    # 2. Demographics Context
    demographics = DemographicContext(
        patient_id=patient.patient_id,
        full_name=patient.full_name,
        calculated_age=patient.calculated_age,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        preferred_language=patient.preferred_language or "English",
        phone_number=patient.phone_number,
        is_active=patient.is_active,
        is_synthetic=patient.is_synthetic,
    )

    if not patient.is_active:
        alerts.append(
            ClinicalAlert(
                code="INACTIVE_PATIENT_RECORD",
                severity=ClinicalAlertSeverity.WARNING,
                category="administrative",
                message="Patient record is deactivated/archived. Clinical context is provided in read-only mode for historical reference.",
            )
        )

    if patient.is_synthetic:
        alerts.append(
            ClinicalAlert(
                code="SYNTHETIC_DEMO_RECORD",
                severity=ClinicalAlertSeverity.INFO,
                category="data_provenance",
                message="This is a synthetic demonstration record generated for development and testing. Do not use for real clinical care.",
            )
        )

    # 3. Allergies Context
    patient_allergies = patient.allergies or []
    if len(patient_allergies) == 0:
        allergy_ctx = AllergyContext(
            allergy_status=AllergyRecordingStatus.NOT_RECORDED,
            documented=[],
            patient_reported=[],
            unverified=[],
            total_count=0,
        )
        alerts.append(
            ClinicalAlert(
                code="ALLERGY_PROFILE_NOT_RECORDED",
                severity=ClinicalAlertSeverity.WARNING,
                category="patient_safety",
                message="No allergy profile has been recorded for this patient. Absence of recorded allergies does NOT indicate No Known Drug Allergies (NKDA). Clinical verification with patient is required.",
            )
        )
    else:
        documented: list[AllergyResponse] = []
        patient_reported: list[AllergyResponse] = []
        unverified: list[AllergyResponse] = []

        for al in patient_allergies:
            resp = AllergyResponse.model_validate(al)
            v_status = (al.verification_status or "").lower()
            if v_status == "documented":
                documented.append(resp)
            elif v_status == "patient_reported":
                patient_reported.append(resp)
            else:
                unverified.append(resp)

        allergy_ctx = AllergyContext(
            allergy_status=AllergyRecordingStatus.RECORDED,
            documented=documented,
            patient_reported=patient_reported,
            unverified=unverified,
            total_count=len(patient_allergies),
        )

        if len(unverified) > 0 or len(patient_reported) > 0:
            alerts.append(
                ClinicalAlert(
                    code="UNCONFIRMED_ALLERGY_RECORDS",
                    severity=ClinicalAlertSeverity.INFO,
                    category="clinical_verification",
                    message=f"Patient has {len(patient_reported)} patient-reported and {len(unverified)} unverified allergy entry/entries requiring clinical review.",
                )
            )

    # 4. Medical History Context
    history_items = patient.medical_history or []
    h_active: list[MedicalHistoryResponse] = []
    h_resolved: list[MedicalHistoryResponse] = []
    h_historical: list[MedicalHistoryResponse] = []
    h_unknown: list[MedicalHistoryResponse] = []

    for h in history_items:
        resp = MedicalHistoryResponse.model_validate(h)
        h_status = (h.status or "").lower()
        if h_status == "active":
            h_active.append(resp)
        elif h_status == "resolved":
            h_resolved.append(resp)
        elif h_status == "historical":
            h_historical.append(resp)
        else:
            h_unknown.append(resp)

    medical_history_ctx = MedicalHistoryContext(
        active=h_active,
        resolved=h_resolved,
        historical=h_historical,
        unknown=h_unknown,
        total_count=len(history_items),
    )

    if len(h_unknown) > 0:
        alerts.append(
            ClinicalAlert(
                code="UNKNOWN_MEDICAL_HISTORY_STATUS",
                severity=ClinicalAlertSeverity.INFO,
                category="data_completeness",
                message=f"{len(h_unknown)} medical condition record(s) have unverified active/resolved status.",
            )
        )

    # 5. Medications Context
    med_items = patient.medications or []
    m_active: list[PatientMedicationResponse] = []
    m_historical: list[PatientMedicationResponse] = []
    m_discontinued: list[PatientMedicationResponse] = []
    m_uncertain: list[PatientMedicationResponse] = []

    has_unlinked_med = False
    for m in med_items:
        resp = PatientMedicationResponse.model_validate(m)
        if m.medication is None:
            has_unlinked_med = True

        m_status = (m.status or "").lower()
        if m_status == "active":
            m_active.append(resp)
        elif m_status == "historical":
            m_historical.append(resp)
        elif m_status == "discontinued":
            m_discontinued.append(resp)
        else:
            # unknown or other unverified statuses are NEVER treated as active
            m_uncertain.append(resp)

    medications_ctx = MedicationContext(
        active=m_active,
        historical=m_historical,
        discontinued=m_discontinued,
        uncertain=m_uncertain,
        total_count=len(med_items),
    )

    if has_unlinked_med:
        alerts.append(
            ClinicalAlert(
                code="UNLINKED_MEDICATION_RECORD",
                severity=ClinicalAlertSeverity.INFO,
                category="data_completeness",
                message="One or more patient medication records lack a linked master catalogue definition.",
            )
        )

    if len(m_uncertain) > 0:
        alerts.append(
            ClinicalAlert(
                code="UNCERTAIN_MEDICATION_STATUS",
                severity=ClinicalAlertSeverity.INFO,
                category="data_completeness",
                message=f"{len(m_uncertain)} medication record(s) have uncertain or unverified therapy status.",
            )
        )

    # 6. Encounters, Reference Encounter & Timeline
    all_encounters = patient.encounters or []
    # Sort encounters chronologically for the timeline
    sorted_encounters = sorted(
        all_encounters, key=lambda e: (e.consultation_date or datetime.min, e.id)
    )

    timeline = [
        EncounterTimelineItem(
            encounter_id=e.encounter_id,
            consultation_date=e.consultation_date,
            doctor_name=e.doctor_name,
            chief_complaint=e.chief_complaint,
            status=e.status,
            is_synthetic=e.is_synthetic,
        )
        for e in sorted_encounters
    ]

    reference_encounter: ReferenceEncounterContext | None = None

    def _extract_encounter_vitals(target_enc: Encounter) -> LatestVitalsContext:
        encounter_vitals = target_enc.vital_signs or []
        sorted_ev = sorted(
            encounter_vitals,
            key=lambda v: v.recorded_at or datetime.min,
            reverse=True,
        )
        enc_ctx = LatestVitalsContext()
        found_any_metric = False

        def _get_metric(field_name: str, unit: str) -> VitalMeasurement:
            nonlocal found_any_metric
            for v in sorted_ev:
                val = getattr(v, field_name, None)
                if val is not None:
                    found_any_metric = True
                    return VitalMeasurement(
                        value=val,
                        unit=unit,
                        recorded_at=v.recorded_at,
                        source_encounter_id=target_enc.encounter_id,
                    )
            return VitalMeasurement(unit=unit)

        enc_ctx.systolic_bp = _get_metric("systolic_bp", "mmHg")
        enc_ctx.diastolic_bp = _get_metric("diastolic_bp", "mmHg")
        enc_ctx.pulse_rate = _get_metric("pulse_rate", "bpm")
        enc_ctx.temperature_celsius = _get_metric("temperature_celsius", "°C")
        enc_ctx.spo2_percentage = _get_metric("spo2_percentage", "%")
        enc_ctx.respiratory_rate = _get_metric("respiratory_rate", "breaths/min")
        enc_ctx.weight_kg = _get_metric("weight_kg", "kg")
        enc_ctx.height_cm = _get_metric("height_cm", "cm")
        enc_ctx.has_any_measurements = found_any_metric

        w = enc_ctx.weight_kg.value
        h = enc_ctx.height_cm.value
        if w is not None and h is not None and h > 0 and w > 0:
            h_m = float(h) / 100.0
            bmi_val = round(float(w) / (h_m ** 2), 2)
            weight_ts = enc_ctx.weight_kg.recorded_at
            height_ts = enc_ctx.height_cm.recorded_at
            gap_days = abs((weight_ts.date() - height_ts.date()).days) if (weight_ts and height_ts) else None
            is_concurrent = (gap_days == 0) if gap_days is not None else None
            bmi_recorded_at = weight_ts if is_concurrent else None

            enc_ctx.bmi = BMIMeasurement(
                value=bmi_val,
                unit="kg/m²",
                weight_kg_used=float(w),
                height_cm_used=float(h),
                weight_recorded_at=weight_ts,
                height_recorded_at=height_ts,
                measurement_gap_days=gap_days,
                is_concurrent=is_concurrent,
                recorded_at=bmi_recorded_at,
                is_derived=True,
            )
        return enc_ctx

    if requested_encounter_id:
        matched_enc = next(
            (e for e in all_encounters if e.encounter_id == requested_encounter_id), None
        )
        if not matched_enc:
            # Check if encounter exists in DB at all (belonging to someone else or missing)
            exists_elsewhere = db.execute(
                select(Encounter).where(Encounter.encounter_id == requested_encounter_id)
            ).scalar_one_or_none()
            if exists_elsewhere:
                raise ClinicalContextEncounterMismatchError(
                    f"Encounter '{requested_encounter_id}' exists but does not belong to patient '{patient_id}'."
                )
            else:
                raise ClinicalContextEncounterNotFoundError(
                    f"Encounter '{requested_encounter_id}' not found."
                )

        reference_encounter = ReferenceEncounterContext(
            encounter_id=matched_enc.encounter_id,
            consultation_date=matched_enc.consultation_date,
            doctor_name=matched_enc.doctor_name,
            chief_complaint=matched_enc.chief_complaint,
            status=matched_enc.status,
            is_synthetic=matched_enc.is_synthetic,
            is_explicitly_requested=True,
            vital_signs=_extract_encounter_vitals(matched_enc),
        )
    else:
        # Default: if encounters exist, select the most recent encounter as context reference
        if len(sorted_encounters) > 0:
            latest_enc = sorted_encounters[-1]
            reference_encounter = ReferenceEncounterContext(
                encounter_id=latest_enc.encounter_id,
                consultation_date=latest_enc.consultation_date,
                doctor_name=latest_enc.doctor_name,
                chief_complaint=latest_enc.chief_complaint,
                status=latest_enc.status,
                is_synthetic=latest_enc.is_synthetic,
                is_explicitly_requested=False,
                vital_signs=_extract_encounter_vitals(latest_enc),
            )

    # 7. Latest Vitals Extraction Across All Available Encounter Telemetry
    # Flatten vital signs across all encounters and sort by recorded_at
    all_vitals: list[tuple[VitalSign, str]] = []
    for enc in all_encounters:
        for v in enc.vital_signs or []:
            all_vitals.append((v, enc.encounter_id))

    # Sort vitals by recorded_at desc to find latest available measurement for each parameter
    all_vitals_sorted = sorted(
        all_vitals,
        key=lambda item: item[0].recorded_at or datetime.min,
        reverse=True,
    )

    vitals_ctx = LatestVitalsContext()
    found_any = False

    def _extract_latest_metric(field_name: str, unit: str) -> VitalMeasurement:
        nonlocal found_any
        for v_record, enc_id in all_vitals_sorted:
            val = getattr(v_record, field_name, None)
            if val is not None:
                found_any = True
                return VitalMeasurement(
                    value=val,
                    unit=unit,
                    recorded_at=v_record.recorded_at,
                    source_encounter_id=enc_id,
                )
        return VitalMeasurement(unit=unit)

    vitals_ctx.systolic_bp = _extract_latest_metric("systolic_bp", "mmHg")
    vitals_ctx.diastolic_bp = _extract_latest_metric("diastolic_bp", "mmHg")
    vitals_ctx.pulse_rate = _extract_latest_metric("pulse_rate", "bpm")
    vitals_ctx.temperature_celsius = _extract_latest_metric("temperature_celsius", "°C")
    vitals_ctx.spo2_percentage = _extract_latest_metric("spo2_percentage", "%")
    vitals_ctx.respiratory_rate = _extract_latest_metric("respiratory_rate", "breaths/min")
    vitals_ctx.weight_kg = _extract_latest_metric("weight_kg", "kg")
    vitals_ctx.height_cm = _extract_latest_metric("height_cm", "cm")
    vitals_ctx.has_any_measurements = found_any

    # Calculate BMI if both weight and height are documented and clinically valid (> 0)
    w = vitals_ctx.weight_kg.value
    h = vitals_ctx.height_cm.value
    if w is not None and h is not None and h > 0 and w > 0:
        h_m = float(h) / 100.0
        bmi_val = round(float(w) / (h_m ** 2), 2)

        weight_ts = vitals_ctx.weight_kg.recorded_at
        height_ts = vitals_ctx.height_cm.recorded_at

        gap_days: int | None = None
        is_concurrent: bool | None = None
        bmi_recorded_at: datetime | None = None

        if weight_ts and height_ts:
            gap_days = abs((weight_ts.date() - height_ts.date()).days)
            is_concurrent = (gap_days == 0)
            if is_concurrent:
                # Concurrent measurements: assign the shared observation timestamp
                bmi_recorded_at = weight_ts
            else:
                # Non-concurrent measurements: do NOT assign the later timestamp as the BMI measurement time
                bmi_recorded_at = None

            if gap_days > bmi_time_gap_threshold_days:
                alerts.append(
                    ClinicalAlert(
                        code="BMI_SOURCE_MEASUREMENTS_TIME_GAP",
                        severity=ClinicalAlertSeverity.WARNING,
                        category="data_quality",
                        message=(
                            f"Body Mass Index (BMI) is derived from height and weight measurements taken "
                            f"{gap_days} days apart (exceeding the {bmi_time_gap_threshold_days}-day threshold). "
                            "Interpret with clinical caution."
                        ),
                    )
                )
        else:
            # Timestamp uncertainty: one or both timestamps missing
            gap_days = None
            is_concurrent = None
            bmi_recorded_at = None
            alerts.append(
                ClinicalAlert(
                    code="BMI_TEMPORAL_ALIGNMENT_UNVERIFIED",
                    severity=ClinicalAlertSeverity.INFO,
                    category="data_quality",
                    message="One or both vital measurements used to derive BMI lack an explicit recorded timestamp. Temporal alignment between height and weight could not be verified.",
                )
            )

        vitals_ctx.bmi = BMIMeasurement(
            value=bmi_val,
            unit="kg/m²",
            weight_kg_used=float(w),
            height_cm_used=float(h),
            weight_recorded_at=weight_ts,
            height_recorded_at=height_ts,
            measurement_gap_days=gap_days,
            is_concurrent=is_concurrent,
            recorded_at=bmi_recorded_at,
            is_derived=True,
        )

    if not found_any:
        alerts.append(
            ClinicalAlert(
                code="MISSING_VITAL_SIGNS",
                severity=ClinicalAlertSeverity.INFO,
                category="patient_telemetry",
                message="No vital sign measurements have been recorded in any outpatient encounter for this patient.",
            )
        )

    return ClinicalContextResponse(
        patient=demographics,
        allergies=allergy_ctx,
        medical_history=medical_history_ctx,
        medications=medications_ctx,
        reference_encounter=reference_encounter,
        latest_vitals=vitals_ctx,
        encounter_timeline=timeline,
        alerts=alerts,
        generated_at=datetime.now(),
    )

