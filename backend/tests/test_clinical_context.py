from datetime import date, datetime, timedelta
import pytest
from fastapi import status

from app.models.allergy import Allergy
from app.models.encounter import Encounter
from app.models.medical_history import MedicalHistory
from app.models.medication import Medication
from app.models.patient import Patient
from app.models.patient_medication import PatientMedication
from app.models.vital_sign import VitalSign
from app.schemas.clinical_context import AllergyRecordingStatus


def _seed_medication(db, med_id="MED-PCM", generic="Paracetamol", ingredients=None):
    med = Medication(
        medication_id=med_id,
        generic_name=generic,
        active_ingredients=ingredients or ["paracetamol"],
        normalized_identifier=generic.lower(),
        is_active=True,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


# =============================================================================
# 1. Complete Patient Clinical Context & Synthetic Provenance (Tests 1 & 18)
# =============================================================================


def test_complete_patient_clinical_context(client, db_session):
    """TEST 1 & 18: Aggregation of complete patient clinical context and synthetic provenance."""
    # Create complete patient
    p = Patient(
        patient_id="CTX-PAT-001",
        full_name="Kavitha Reddy",
        date_of_birth=date(1990, 8, 15),
        gender="Female",
        preferred_language="Telugu",
        phone_number="+91-98765-43210",
        is_active=True,
        is_synthetic=True,
    )
    db_session.add(p)
    db_session.commit()

    # Allergy
    al = Allergy(
        patient_id=p.id,
        substance="Penicillin",
        reaction="Anaphylaxis",
        severity="severe",
        verification_status="documented",
    )
    db_session.add(al)

    # Medical History
    mh1 = MedicalHistory(
        patient_id=p.id,
        condition="Hypothyroidism",
        status="active",
        onset_date=date(2020, 1, 1),
        source="physician_documented",
    )
    db_session.add(mh1)

    # Medication
    med = _seed_medication(db_session, "MED-THYROX", "Levothyroxine", ["levothyroxine"])
    pm = PatientMedication(
        patient_id=p.id,
        medication_id=med.id,
        status="active",
        prescribed_date=datetime(2020, 1, 5),
        source="opd_prescription",
        is_synthetic=True,
    )
    db_session.add(pm)

    # Encounter & Vitals
    enc = Encounter(
        encounter_id="CTX-ENC-001",
        patient_id=p.id,
        doctor_name="Dr. Suresh Rao",
        chief_complaint="Thyroid function follow-up",
        consultation_date=datetime(2026, 11, 1, 10, 0),
        status="completed",
        is_synthetic=True,
    )
    db_session.add(enc)
    db_session.commit()

    vitals = VitalSign(
        encounter_id=enc.id,
        systolic_bp=120.0,
        diastolic_bp=80.0,
        pulse_rate=72,
        temperature_celsius=36.6,
        spo2_percentage=99.0,
        respiratory_rate=16,
        weight_kg=60.0,
        height_cm=165.0,
        recorded_at=datetime(2026, 11, 1, 10, 5),
    )
    db_session.add(vitals)
    db_session.commit()

    resp = client.get("/api/v1/patients/CTX-PAT-001/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    # Demographics
    assert data["patient"]["patient_id"] == "CTX-PAT-001"
    assert data["patient"]["full_name"] == "Kavitha Reddy"
    assert data["patient"]["preferred_language"] == "Telugu"
    assert data["patient"]["is_synthetic"] is True

    # Allergies
    assert data["allergies"]["allergy_status"] == AllergyRecordingStatus.RECORDED.value
    assert len(data["allergies"]["documented"]) == 1
    assert data["allergies"]["documented"][0]["substance"] == "Penicillin"

    # Medical History
    assert len(data["medical_history"]["active"]) == 1
    assert data["medical_history"]["active"][0]["condition"] == "Hypothyroidism"

    # Medications
    assert len(data["medications"]["active"]) == 1
    assert data["medications"]["active"][0]["medication"]["generic_name"] == "Levothyroxine"

    # Vitals & BMI
    assert data["latest_vitals"]["has_any_measurements"] is True
    assert data["latest_vitals"]["systolic_bp"]["value"] == 120.0
    assert data["latest_vitals"]["diastolic_bp"]["value"] == 80.0
    assert data["latest_vitals"]["bmi"]["value"] is not None
    # 60 / (1.65^2) = 22.04
    assert round(data["latest_vitals"]["bmi"]["value"], 1) == 22.0

    # Reference encounter & timeline
    assert data["reference_encounter"]["encounter_id"] == "CTX-ENC-001"
    assert len(data["encounter_timeline"]) == 1

    # Synthetic Alert
    alert_codes = {a["code"] for a in data["alerts"]}
    assert "SYNTHETIC_DEMO_RECORD" in alert_codes


# =============================================================================
# 2. Patient with No Allergy Records (Test 2)
# =============================================================================


def test_patient_with_no_allergy_records(client, db_session):
    """TEST 2: Empty allergy list must NOT mean NKDA; must emit warning alert."""
    p = Patient(patient_id="NO-ALLERGY-PAT", full_name="No Allergy Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    resp = client.get("/api/v1/patients/NO-ALLERGY-PAT/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    assert data["allergies"]["allergy_status"] == AllergyRecordingStatus.NOT_RECORDED.value
    assert data["allergies"]["total_count"] == 0
    assert len(data["allergies"]["documented"]) == 0

    alert_codes = {a["code"] for a in data["alerts"]}
    assert "ALLERGY_PROFILE_NOT_RECORDED" in alert_codes
    alert = next(a for a in data["alerts"] if a["code"] == "ALLERGY_PROFILE_NOT_RECORDED")
    assert "NKDA" in alert["message"]


# =============================================================================
# 3. Patient with Documented vs Unverified Allergies (Tests 3 & 4)
# =============================================================================


def test_allergy_verification_categories(client, db_session):
    """TEST 3 & 4: Correct segregation of documented, patient_reported, and unverified allergies."""
    p = Patient(patient_id="MIXED-ALLERGY-PAT", full_name="Mixed Allergy Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add_all([
        Allergy(patient_id=p.id, substance="Aspirin", verification_status="documented"),
        Allergy(patient_id=p.id, substance="Sulfa Drugs", verification_status="patient_reported"),
        Allergy(patient_id=p.id, substance="Dust", verification_status="unverified"),
    ])
    db_session.commit()

    resp = client.get("/api/v1/patients/MIXED-ALLERGY-PAT/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    assert data["allergies"]["allergy_status"] == AllergyRecordingStatus.RECORDED.value
    assert data["allergies"]["total_count"] == 3
    assert len(data["allergies"]["documented"]) == 1
    assert data["allergies"]["documented"][0]["substance"] == "Aspirin"
    assert len(data["allergies"]["patient_reported"]) == 1
    assert data["allergies"]["patient_reported"][0]["substance"] == "Sulfa Drugs"
    assert len(data["allergies"]["unverified"]) == 1
    assert data["allergies"]["unverified"][0]["substance"] == "Dust"

    alert_codes = {a["code"] for a in data["alerts"]}
    assert "UNCONFIRMED_ALLERGY_RECORDS" in alert_codes


# =============================================================================
# 4. Medical History Categories (Tests 5 & 6)
# =============================================================================


def test_medical_history_status_categories(client, db_session):
    """TEST 5 & 6: Active, resolved, historical, and unknown medical history segregation."""
    p = Patient(patient_id="HISTORY-PAT", full_name="History Test Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add_all([
        MedicalHistory(patient_id=p.id, condition="Type 2 Diabetes", status="active"),
        MedicalHistory(patient_id=p.id, condition="Acute Bronchitis", status="resolved"),
        MedicalHistory(patient_id=p.id, condition="Appendectomy", status="historical"),
        MedicalHistory(patient_id=p.id, condition="Chest Pain unspecified", status="unknown"),
    ])
    db_session.commit()

    resp = client.get("/api/v1/patients/HISTORY-PAT/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    hist = data["medical_history"]
    assert hist["total_count"] == 4
    assert len(hist["active"]) == 1
    assert hist["active"][0]["condition"] == "Type 2 Diabetes"
    assert len(hist["resolved"]) == 1
    assert hist["resolved"][0]["condition"] == "Acute Bronchitis"
    assert len(hist["historical"]) == 1
    assert hist["historical"][0]["condition"] == "Appendectomy"
    assert len(hist["unknown"]) == 1
    assert hist["unknown"][0]["condition"] == "Chest Pain unspecified"

    alert_codes = {a["code"] for a in data["alerts"]}
    assert "UNKNOWN_MEDICAL_HISTORY_STATUS" in alert_codes


# =============================================================================
# 5. Medication Status Categories (Test 7)
# =============================================================================


def test_medication_status_categories(client, db_session):
    """TEST 7: Active, historical, discontinued, and uncertain medications."""
    p = Patient(patient_id="MEDS-PAT", full_name="Medications Test Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    m1 = _seed_medication(db_session, "MED-A", "Metformin")
    m2 = _seed_medication(db_session, "MED-B", "Atorvastatin")
    m3 = _seed_medication(db_session, "MED-C", "Amoxicillin")
    m4 = _seed_medication(db_session, "MED-D", "Omeprazole")

    db_session.add_all([
        PatientMedication(patient_id=p.id, medication_id=m1.id, status="active"),
        PatientMedication(patient_id=p.id, medication_id=m2.id, status="historical"),
        PatientMedication(patient_id=p.id, medication_id=m3.id, status="discontinued"),
        PatientMedication(patient_id=p.id, medication_id=m4.id, status="unknown"),
    ])
    db_session.commit()

    resp = client.get("/api/v1/patients/MEDS-PAT/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    meds = data["medications"]
    assert meds["total_count"] == 4
    assert len(meds["active"]) == 1
    assert meds["active"][0]["medication"]["generic_name"] == "Metformin"
    assert len(meds["historical"]) == 1
    assert meds["historical"][0]["medication"]["generic_name"] == "Atorvastatin"
    assert len(meds["discontinued"]) == 1
    assert meds["discontinued"][0]["medication"]["generic_name"] == "Amoxicillin"
    assert len(meds["uncertain"]) == 1
    assert meds["uncertain"][0]["medication"]["generic_name"] == "Omeprazole"

    # Unknown is NOT active!
    assert "Omeprazole" not in [m["medication"]["generic_name"] for m in meds["active"]]
    alert_codes = {a["code"] for a in data["alerts"]}
    assert "UNCERTAIN_MEDICATION_STATUS" in alert_codes


# =============================================================================
# 6. Encounters, Multiple Encounters & Chronological Timeline (Tests 8, 9, 10)
# =============================================================================


def test_patient_with_no_encounters(client, db_session):
    """TEST 8: Patient with zero encounters returns empty timeline and null reference."""
    p = Patient(patient_id="ZERO-ENC-PAT", full_name="Zero Encounters Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    resp = client.get("/api/v1/patients/ZERO-ENC-PAT/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    assert data["reference_encounter"] is None
    assert len(data["encounter_timeline"]) == 0
    assert data["latest_vitals"]["has_any_measurements"] is False


def test_multiple_encounters_chronological_ordering(client, db_session):
    """TEST 9 & 10: Chronological timeline ordering across multiple encounters."""
    p = Patient(patient_id="MULTI-ENC-PAT", full_name="Multi Encounters Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    # Add 3 encounters in shuffled date order
    e2 = Encounter(
        encounter_id="ENC-MIDDLE",
        patient_id=p.id,
        consultation_date=datetime(2026, 6, 15, 11, 0),
        status="completed",
        chief_complaint="Second visit",
    )
    e1 = Encounter(
        encounter_id="ENC-EARLIEST",
        patient_id=p.id,
        consultation_date=datetime(2026, 1, 10, 9, 30),
        status="completed",
        chief_complaint="First visit",
    )
    e3 = Encounter(
        encounter_id="ENC-LATEST",
        patient_id=p.id,
        consultation_date=datetime(2026, 11, 1, 14, 0),
        status="in_progress",
        chief_complaint="Recent visit",
    )
    db_session.add_all([e2, e1, e3])
    db_session.commit()

    resp = client.get("/api/v1/patients/MULTI-ENC-PAT/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    # Timeline must be strictly chronological
    timeline = data["encounter_timeline"]
    assert len(timeline) == 3
    assert timeline[0]["encounter_id"] == "ENC-EARLIEST"
    assert timeline[1]["encounter_id"] == "ENC-MIDDLE"
    assert timeline[2]["encounter_id"] == "ENC-LATEST"

    # Default reference encounter is the latest
    assert data["reference_encounter"]["encounter_id"] == "ENC-LATEST"
    assert data["reference_encounter"]["is_explicitly_requested"] is False


# =============================================================================
# 7. Vitals Telemetry, Differing Timestamps & BMI (Tests 11, 12, 13, 14)
# =============================================================================


def test_vitals_differing_timestamps_and_bmi(client, db_session):
    """TEST 11 & 13: Preserves individual timestamps across measurements and computes BMI."""
    p = Patient(patient_id="VITALS-TIMING-PAT", full_name="Vitals Timing Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    e1 = Encounter(encounter_id="ENC-V1", patient_id=p.id, consultation_date=datetime(2026, 9, 1))
    e2 = Encounter(encounter_id="ENC-V2", patient_id=p.id, consultation_date=datetime(2026, 10, 1))
    db_session.add_all([e1, e2])
    db_session.commit()

    # Height measured in Encounter 1 on Sep 1
    t1 = datetime(2026, 9, 1, 9, 0)
    v1 = VitalSign(encounter_id=e1.id, height_cm=180.0, recorded_at=t1)

    # Weight and BP measured in Encounter 2 on Oct 1 (Height not remeasured)
    t2 = datetime(2026, 10, 1, 10, 0)
    v2 = VitalSign(encounter_id=e2.id, weight_kg=81.0, systolic_bp=130.0, diastolic_bp=85.0, recorded_at=t2)
    db_session.add_all([v1, v2])
    db_session.commit()

    resp = client.get("/api/v1/patients/VITALS-TIMING-PAT/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    vitals = data["latest_vitals"]

    # Height should preserve t1 and ENC-V1
    assert vitals["height_cm"]["value"] == 180.0
    assert vitals["height_cm"]["source_encounter_id"] == "ENC-V1"

    # Weight should preserve t2 and ENC-V2
    assert vitals["weight_kg"]["value"] == 81.0
    assert vitals["weight_kg"]["source_encounter_id"] == "ENC-V2"

    # BMI = 81 / (1.80^2) = 25.0
    assert vitals["bmi"]["value"] == 25.0
    assert vitals["bmi"]["is_derived"] is True
    assert vitals["bmi"]["weight_kg_used"] == 81.0
    assert vitals["bmi"]["height_cm_used"] == 180.0


def test_missing_vitals_and_missing_bmi(client, db_session):
    """TEST 12 & 14: Missing vitals remain null (not zero); BMI is null when height or weight missing."""
    p = Patient(patient_id="NO-VITALS-PAT", full_name="No Vitals Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    e = Encounter(encounter_id="ENC-PARTIAL", patient_id=p.id)
    db_session.add(e)
    db_session.commit()

    # Only pulse recorded
    v = VitalSign(encounter_id=e.id, pulse_rate=78)
    db_session.add(v)
    db_session.commit()

    resp = client.get("/api/v1/patients/NO-VITALS-PAT/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    vitals = data["latest_vitals"]

    assert vitals["pulse_rate"]["value"] == 78
    # Unrecorded metrics must be None, NOT 0.0!
    assert vitals["systolic_bp"]["value"] is None
    assert vitals["temperature_celsius"]["value"] is None
    assert vitals["spo2_percentage"]["value"] is None
    assert vitals["weight_kg"]["value"] is None
    assert vitals["height_cm"]["value"] is None
    assert vitals["bmi"]["value"] is None


# =============================================================================
# 8. Inactive Patient, Nonexistent Patient & Encounter Mismatch (Tests 15, 16, 17)
# =============================================================================


def test_inactive_patient_read_only_context(client, db_session):
    """TEST 15: Inactive patient is accessible in read-only mode with an explicit alert."""
    p = Patient(patient_id="INACTIVE-PAT-01", full_name="Archived Patient", is_active=False)
    db_session.add(p)
    db_session.commit()

    resp = client.get("/api/v1/patients/INACTIVE-PAT-01/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    assert data["patient"]["is_active"] is False
    alert_codes = {a["code"] for a in data["alerts"]}
    assert "INACTIVE_PATIENT_RECORD" in alert_codes


def test_nonexistent_patient_returns_404(client):
    """TEST 16: Requesting context for a nonexistent patient returns HTTP 404."""
    resp = client.get("/api/v1/patients/DOES-NOT-EXIST/clinical-context")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_encounter_mismatch_returns_404(client, db_session):
    """TEST 17: Requesting an encounter belonging to another patient returns HTTP 404."""
    p1 = Patient(patient_id="PAT-ALPHA", full_name="Patient Alpha", is_active=True)
    p2 = Patient(patient_id="PAT-BETA", full_name="Patient Beta", is_active=True)
    db_session.add_all([p1, p2])
    db_session.commit()

    # Encounter belongs to Patient Beta
    e_beta = Encounter(encounter_id="ENC-BETA-01", patient_id=p2.id)
    db_session.add(e_beta)
    db_session.commit()

    # Request Patient Alpha's context with Patient Beta's encounter ID
    resp = client.get("/api/v1/patients/PAT-ALPHA/clinical-context?encounter_id=ENC-BETA-01")
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert "does not belong" in resp.json()["detail"].lower()


def test_requested_reference_encounter_success(client, db_session):
    """Verifies explicitly requested encounter is flagged as reference encounter."""
    p = Patient(patient_id="REQ-ENC-PAT", full_name="Requested Enc Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    e1 = Encounter(encounter_id="ENC-TARGET", patient_id=p.id, chief_complaint="Specific target consultation")
    db_session.add(e1)
    db_session.commit()

    resp = client.get("/api/v1/patients/REQ-ENC-PAT/clinical-context?encounter_id=ENC-TARGET")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    assert data["reference_encounter"]["encounter_id"] == "ENC-TARGET"
    assert data["reference_encounter"]["is_explicitly_requested"] is True
    assert data["reference_encounter"]["chief_complaint"] == "Specific target consultation"


# =============================================================================
# 9. Patient with Incomplete Clinical Records (Test 19)
# =============================================================================


def test_patient_with_incomplete_clinical_records(client, db_session):
    """TEST 19: Robust handling of partial/sparse patient records without errors."""
    p = Patient(
        patient_id="INCOMPLETE-PAT-01",
        full_name="Sparse Record Patient",
        # date_of_birth is None
        # age is None
        # gender is None
        # phone is None
        is_active=True,
    )
    db_session.add(p)
    db_session.commit()

    resp = client.get("/api/v1/patients/INCOMPLETE-PAT-01/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    assert data["patient"]["patient_id"] == "INCOMPLETE-PAT-01"
    assert data["patient"]["date_of_birth"] is None
    assert data["patient"]["calculated_age"] is None
    assert data["allergies"]["total_count"] == 0
    assert data["medical_history"]["total_count"] == 0
    assert data["medications"]["total_count"] == 0
    assert data["reference_encounter"] is None
    assert data["latest_vitals"]["has_any_measurements"] is False


# =============================================================================
# 10. Targeted Remediation: Unlinked Medications & BMI Temporal Logic (Phase 4.1)
# =============================================================================


def test_unlinked_medication_relationship_handled_safely(client, db_session):
    """FINDING P4-002: PatientMedication with null Medication relationship serializes safely.

    Verifies:
    - Endpoint returns successfully (HTTP 200).
    - PatientMedication record is preserved.
    - Nested medication field is explicitly null.
    - No medication identity or active ingredients are invented.
    """
    p = Patient(patient_id="ORPHAN-MED-PAT", full_name="Orphan Med Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    # Create PatientMedication pointing to a non-existent medication_id
    pm = PatientMedication(
        patient_id=p.id,
        medication_id=99999,
        status="active",
        source="past_unlinked_records",
    )
    db_session.add(pm)
    db_session.commit()

    resp = client.get("/api/v1/patients/ORPHAN-MED-PAT/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    meds = data["medications"]
    assert meds["total_count"] == 1
    assert len(meds["active"]) == 1
    record = meds["active"][0]

    assert record["id"] == pm.id
    assert record["medication_id"] == 99999
    assert record["source"] == "past_unlinked_records"
    assert record["medication"] is None  # Nested medication is explicitly null

    alert_codes = {a["code"] for a in data["alerts"]}
    assert "UNLINKED_MEDICATION_RECORD" in alert_codes


def test_bmi_concurrent_measurements_same_date(client, db_session):
    """FINDING P4-001: Concurrent height and weight on the same date."""
    p = Patient(patient_id="BMI-SAME-DATE", full_name="Same Date Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    e = Encounter(encounter_id="ENC-SAME", patient_id=p.id)
    db_session.add(e)
    db_session.commit()

    t = datetime(2026, 11, 10, 10, 0)
    v = VitalSign(encounter_id=e.id, height_cm=170.0, weight_kg=68.0, recorded_at=t)
    db_session.add(v)
    db_session.commit()

    resp = client.get("/api/v1/patients/BMI-SAME-DATE/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    bmi = data["latest_vitals"]["bmi"]

    assert bmi["value"] == 23.53  # 68 / (1.70^2)
    assert bmi["is_concurrent"] is True
    assert bmi["measurement_gap_days"] == 0
    assert bmi["recorded_at"] is not None
    assert bmi["height_recorded_at"] is not None
    assert bmi["weight_recorded_at"] is not None

    alert_codes = {a["code"] for a in data["alerts"]}
    assert "BMI_SOURCE_MEASUREMENTS_TIME_GAP" not in alert_codes


def test_bmi_measurements_within_configured_threshold(client, db_session):
    """FINDING P4-001: Height and weight measured within threshold (e.g. 60 days < 365) does not trigger warning alert.
    Also verifies callers cannot override the threshold via query parameter.
    """
    p = Patient(patient_id="BMI-WITHIN-GAP", full_name="Within Gap Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    e1 = Encounter(encounter_id="ENC-W1", patient_id=p.id, consultation_date=datetime(2026, 1, 1))
    e2 = Encounter(encounter_id="ENC-W2", patient_id=p.id, consultation_date=datetime(2026, 3, 2))
    db_session.add_all([e1, e2])
    db_session.commit()

    t1 = datetime(2026, 1, 1, 9, 0)
    t2 = datetime(2026, 3, 2, 10, 0)  # 60 days apart

    db_session.add(VitalSign(encounter_id=e1.id, height_cm=160.0, recorded_at=t1))
    db_session.add(VitalSign(encounter_id=e2.id, weight_kg=64.0, recorded_at=t2))
    db_session.commit()

    resp = client.get("/api/v1/patients/BMI-WITHIN-GAP/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    bmi = data["latest_vitals"]["bmi"]

    assert bmi["value"] == 25.0
    assert bmi["is_concurrent"] is False
    assert bmi["measurement_gap_days"] == 60
    # Must NOT assign later timestamp as actual measurement time of BMI
    assert bmi["recorded_at"] is None

    alert_codes = {a["code"] for a in data["alerts"]}
    assert "BMI_SOURCE_MEASUREMENTS_TIME_GAP" not in alert_codes

    # Callers cannot override threshold via API query parameter:
    # Passing a strict threshold (30 days) via query parameter is ignored by the API, so no alert is triggered
    resp_override = client.get("/api/v1/patients/BMI-WITHIN-GAP/clinical-context?bmi_time_gap_threshold_days=30")
    assert resp_override.status_code == status.HTTP_200_OK
    override_codes = {a["code"] for a in resp_override.json()["alerts"]}
    assert "BMI_SOURCE_MEASUREMENTS_TIME_GAP" not in override_codes


def test_bmi_measurements_beyond_configured_threshold(client, db_session):
    """FINDING P4-001: Height and weight measured beyond threshold (> 365 days) emits warning alert.
    Also verifies callers cannot suppress or override the threshold via query parameter.
    """
    p = Patient(patient_id="BMI-BEYOND-GAP", full_name="Beyond Gap Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    e1 = Encounter(encounter_id="ENC-OLD", patient_id=p.id, consultation_date=datetime(2024, 1, 1))
    e2 = Encounter(encounter_id="ENC-NEW", patient_id=p.id, consultation_date=datetime(2026, 1, 1))
    db_session.add_all([e1, e2])
    db_session.commit()

    t_old = datetime(2024, 1, 1, 10, 0)
    t_new = datetime(2026, 1, 1, 10, 0)  # 731 days apart

    db_session.add(VitalSign(encounter_id=e1.id, height_cm=175.0, recorded_at=t_old))
    db_session.add(VitalSign(encounter_id=e2.id, weight_kg=70.0, recorded_at=t_new))
    db_session.commit()

    # Query with default 365-day threshold
    resp = client.get("/api/v1/patients/BMI-BEYOND-GAP/clinical-context")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    bmi = data["latest_vitals"]["bmi"]

    assert bmi["value"] == 22.86
    assert bmi["is_concurrent"] is False
    assert bmi["measurement_gap_days"] == 731
    assert bmi["recorded_at"] is None

    alert_codes = {a["code"] for a in data["alerts"]}
    assert "BMI_SOURCE_MEASUREMENTS_TIME_GAP" in alert_codes
    alert = next(a for a in data["alerts"] if a["code"] == "BMI_SOURCE_MEASUREMENTS_TIME_GAP")
    assert "731 days apart" in alert["message"]

    # Callers cannot suppress the alert via API query parameter:
    # Passing a lenient threshold (1000 days) via query parameter is ignored by the API, so alert remains
    resp_override = client.get("/api/v1/patients/BMI-BEYOND-GAP/clinical-context?bmi_time_gap_threshold_days=1000")
    assert resp_override.status_code == status.HTTP_200_OK
    override_codes = {a["code"] for a in resp_override.json()["alerts"]}
    assert "BMI_SOURCE_MEASUREMENTS_TIME_GAP" in override_codes


def test_bmi_threshold_not_exposed_in_api_schema(client):
    """Verify that bmi_time_gap_threshold_days is not exposed as a query parameter in the API contract."""
    from app.main import app

    openapi = app.openapi()
    endpoint_spec = openapi["paths"]["/api/v1/patients/{patient_id}/clinical-context"]["get"]
    param_names = [p["name"] for p in endpoint_spec.get("parameters", [])]
    assert "bmi_time_gap_threshold_days" not in param_names
    assert "encounter_id" in param_names
    assert "patient_id" in param_names


def test_bmi_with_missing_measurement_timestamp(db_session):
    """FINDING P4-001: Missing measurement timestamp emits uncertainty alert.

    Note on Database Constraints:
    `VitalSign.recorded_at` is declared with `nullable=False, server_default=func.now()`,
    guaranteeing non-null timestamps at the SQLite schema level during real inserts.
    Here we simulate an in-memory missing timestamp to verify defensive service handling.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.services.clinical_context import aggregate_clinical_context

    p = Patient(patient_id="BMI-NO-TS", full_name="No TS Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    e = Encounter(encounter_id="ENC-NO-TS", patient_id=p.id)
    db_session.add(e)
    db_session.commit()

    v1 = VitalSign(encounter_id=e.id, height_cm=165.0)
    v2 = VitalSign(encounter_id=e.id, weight_kg=60.0)
    db_session.add_all([v1, v2])
    db_session.commit()

    # Preload patient with relationships in this session
    stmt = (
        select(Patient)
        .where(Patient.patient_id == "BMI-NO-TS")
        .options(
            selectinload(Patient.allergies),
            selectinload(Patient.medical_history),
            selectinload(Patient.encounters).selectinload(Encounter.vital_signs),
            selectinload(Patient.medications).selectinload(PatientMedication.medication),
        )
    )
    loaded_p = db_session.execute(stmt).scalar_one()
    # Explicitly set recorded_at on height measurement to None in memory
    for enc in loaded_p.encounters:
        for v in enc.vital_signs:
            if v.height_cm:
                v.recorded_at = None

    res = aggregate_clinical_context(db_session, "BMI-NO-TS")
    assert res is not None
    bmi = res.latest_vitals.bmi

    assert bmi.value == 22.04
    assert bmi.is_concurrent is None
    assert bmi.measurement_gap_days is None
    assert bmi.recorded_at is None

    alert_codes = {a.code for a in res.alerts}
    assert "BMI_TEMPORAL_ALIGNMENT_UNVERIFIED" in alert_codes


