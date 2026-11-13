from datetime import date, datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.allergy import Allergy
from app.models.encounter import Encounter
from app.models.medical_history import MedicalHistory
from app.models.patient import Patient
from app.models.vital_sign import VitalSign


def seed_synthetic_clinical_data(db: Session) -> dict[str, int]:
    """Seeds deterministic, clearly marked synthetic patient records for OPD demonstration.

    All generated records explicitly persist `is_synthetic=True`.
    Idempotent: skips records that already exist. Never modifies real clinical data.
    Returns counts of created and existing records.
    """
    stats = {
        "patients_created": 0,
        "patients_existing": 0,
        "encounters_created": 0,
        "allergies_created": 0,
        "history_created": 0,
        "vitals_created": 0,
    }

    # =========================================================================
    # Patient 1: Chronic OPD Patient (Kannada, Multiple Encounters, Allergies)
    # =========================================================================
    p1 = db.execute(
        select(Patient).where(Patient.patient_id == "SYN-PAT-001")
    ).scalar_one_or_none()

    if not p1:
        p1 = Patient(
            patient_id="SYN-PAT-001",
            full_name="Ramesh Kumar (Synthetic Fictional)",
            date_of_birth=date(1975, 4, 12),
            age=51,
            gender="Male",
            phone_number="+91-99999-00001",
            preferred_language="Kannada",
            is_synthetic=True,
            is_active=True,
        )
        db.add(p1)
        db.flush()
        stats["patients_created"] += 1

        a1 = Allergy(
            patient_id=p1.id,
            substance="Amoxicillin",
            reaction="Urticaria and erythema (rash)",
            severity="moderate",
            verification_status="documented",
        )
        db.add(a1)
        stats["allergies_created"] += 1

        h1 = MedicalHistory(
            patient_id=p1.id,
            condition="Type 2 Diabetes Mellitus",
            description="Diagnosed 2018, managed on oral metformin (Synthetic)",
            status="active",
            onset_date=date(2018, 6, 1),
            source="past_records",
        )
        h2 = MedicalHistory(
            patient_id=p1.id,
            condition="Essential Hypertension",
            description="Grade 1 hypertension noted during routine screening (Synthetic)",
            status="active",
            onset_date=date(2021, 3, 15),
            source="physician_documented",
        )
        db.add_all([h1, h2])
        stats["history_created"] += 2

        e1 = Encounter(
            encounter_id="SYN-ENC-001-A",
            patient_id=p1.id,
            doctor_name="Dr. Ananya Sharma",
            chief_complaint="Routine diabetes and hypertension quarterly review",
            consultation_date=datetime(2026, 10, 10, 10, 30),
            status="completed",
            is_synthetic=True,
        )
        db.add(e1)
        db.flush()
        stats["encounters_created"] += 1

        v1 = VitalSign(
            encounter_id=e1.id,
            systolic_bp=138.0,
            diastolic_bp=88.0,
            pulse_rate=76,
            temperature_celsius=36.8,
            spo2_percentage=98.0,
            respiratory_rate=16,
            weight_kg=74.5,
            height_cm=172.0,
        )
        db.add(v1)
        stats["vitals_created"] += 1

        e2 = Encounter(
            encounter_id="SYN-ENC-001-B",
            patient_id=p1.id,
            doctor_name="Dr. Ananya Sharma",
            chief_complaint="Productive cough and low-grade evening chills for 4 days",
            consultation_date=datetime(2026, 11, 5, 11, 15),
            status="completed",
            is_synthetic=True,
        )
        db.add(e2)
        db.flush()
        stats["encounters_created"] += 1

        v2 = VitalSign(
            encounter_id=e2.id,
            systolic_bp=132.0,
            diastolic_bp=84.0,
            pulse_rate=82,
            temperature_celsius=37.5,
            spo2_percentage=97.0,
            respiratory_rate=18,
            weight_kg=74.0,
            height_cm=172.0,
        )
        db.add(v2)
        stats["vitals_created"] += 1
    else:
        stats["patients_existing"] += 1

    # =========================================================================
    # Patient 2: Adult Female (Hindi, Patient-Reported Allergy, Resolved Condition)
    # =========================================================================
    p2 = db.execute(
        select(Patient).where(Patient.patient_id == "SYN-PAT-002")
    ).scalar_one_or_none()

    if not p2:
        p2 = Patient(
            patient_id="SYN-PAT-002",
            full_name="Sunita Devi (Synthetic Fictional)",
            date_of_birth=date(1988, 8, 24),
            age=38,
            gender="Female",
            phone_number="+91-99999-00002",
            preferred_language="Hindi",
            is_synthetic=True,
            is_active=True,
        )
        db.add(p2)
        db.flush()
        stats["patients_created"] += 1

        a2 = Allergy(
            patient_id=p2.id,
            substance="Ciprofloxacin",
            reaction="Nausea, severe epigastric distress",
            severity="mild",
            verification_status="patient_reported",
        )
        db.add(a2)
        stats["allergies_created"] += 1

        h3 = MedicalHistory(
            patient_id=p2.id,
            condition="Hypothyroidism",
            description="On daily levothyroxine replacement (Synthetic)",
            status="active",
            onset_date=date(2019, 11, 10),
            source="patient_reported",
        )
        h4 = MedicalHistory(
            patient_id=p2.id,
            condition="Acute Bronchitis",
            description="Resolved episode during winter 2024 (Synthetic)",
            status="resolved",
            onset_date=date(2024, 12, 1),
            source="past_records",
        )
        db.add_all([h3, h4])
        stats["history_created"] += 2

        e3 = Encounter(
            encounter_id="SYN-ENC-002-A",
            patient_id=p2.id,
            doctor_name="Dr. Rajesh Verma",
            chief_complaint="Knee joint aches and morning stiffness",
            consultation_date=datetime(2026, 11, 8, 14, 0),
            status="completed",
            is_synthetic=True,
        )
        db.add(e3)
        db.flush()
        stats["encounters_created"] += 1

        v3 = VitalSign(
            encounter_id=e3.id,
            systolic_bp=118.0,
            diastolic_bp=76.0,
            pulse_rate=72,
            temperature_celsius=36.6,
            spo2_percentage=99.0,
            respiratory_rate=14,
            weight_kg=62.0,
            height_cm=158.0,
        )
        db.add(v3)
        stats["vitals_created"] += 1
    else:
        stats["patients_existing"] += 1

    # =========================================================================
    # Patient 3: Elderly Patient with Incomplete Intake Data (English, Uncertain Status)
    # =========================================================================
    p3 = db.execute(
        select(Patient).where(Patient.patient_id == "SYN-PAT-003")
    ).scalar_one_or_none()

    if not p3:
        p3 = Patient(
            patient_id="SYN-PAT-003",
            full_name="David D'Souza (Synthetic Fictional)",
            date_of_birth=None,
            age=64,
            gender="Male",
            phone_number=None,
            preferred_language="English",
            is_synthetic=True,
            is_active=True,
        )
        db.add(p3)
        db.flush()
        stats["patients_created"] += 1

        a3 = Allergy(
            patient_id=p3.id,
            substance="Sulfa antibiotics",
            reaction=None,
            severity=None,
            verification_status="unverified",
        )
        db.add(a3)
        stats["allergies_created"] += 1

        h5 = MedicalHistory(
            patient_id=p3.id,
            condition="Chronic Kidney Disease",
            description="Reported mild renal impairment from outside lab; baseline creatinine unknown (Synthetic)",
            status="unknown",
            onset_date=None,
            source="patient_reported",
        )
        db.add(h5)
        stats["history_created"] += 1

        e4 = Encounter(
            encounter_id="SYN-ENC-003-A",
            patient_id=p3.id,
            doctor_name="Dr. Vikram Rao",
            chief_complaint="Bilateral lower extremity edema and diminished urine output",
            consultation_date=datetime(2026, 11, 10, 9, 30),
            status="in_progress",
            is_synthetic=True,
        )
        db.add(e4)
        db.flush()
        stats["encounters_created"] += 1

        v4 = VitalSign(
            encounter_id=e4.id,
            systolic_bp=156.0,
            diastolic_bp=96.0,
            pulse_rate=88,
            temperature_celsius=None,
            spo2_percentage=96.0,
            respiratory_rate=None,
            weight_kg=81.0,
            height_cm=None,
        )
        db.add(v4)
        stats["vitals_created"] += 1
    else:
        stats["patients_existing"] += 1

    db.commit()
    return stats
