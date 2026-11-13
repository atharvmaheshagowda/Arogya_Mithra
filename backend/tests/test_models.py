from datetime import date, datetime
from sqlalchemy import select

from app.models.allergy import Allergy
from app.models.encounter import Encounter
from app.models.medical_history import MedicalHistory
from app.models.patient import Patient
from app.models.vital_sign import VitalSign
from app.services.patient_service import deactivate_or_delete_patient
from app.services.synthetic_data import seed_synthetic_clinical_data


def test_model_persistence_and_relationships(db_session):
    """Verifies ORM relationships, persistence across session flush, and calculated_age property."""
    patient = Patient(
        patient_id="PERSIST-PAT-1",
        full_name="Persistent Patient",
        date_of_birth=date(1990, 1, 1),
        gender="Other",
        is_synthetic=False,
    )
    db_session.add(patient)
    db_session.flush()

    allergy = Allergy(
        patient_id=patient.id,
        substance="Aspirin",
        reaction="Bronchospasm",
        severity="severe",
        verification_status="documented",
    )
    history = MedicalHistory(
        patient_id=patient.id,
        condition="Allergic Rhinitis",
        status="active",
        source="physician_documented",
    )
    encounter = Encounter(
        encounter_id="PERSIST-ENC-1",
        patient_id=patient.id,
        doctor_name="Dr. Rao",
        status="completed",
    )
    db_session.add_all([allergy, history, encounter])
    db_session.flush()

    vitals = VitalSign(
        encounter_id=encounter.id,
        systolic_bp=125.0,
        diastolic_bp=82.0,
        pulse_rate=70,
        temperature_celsius=36.7,
    )
    db_session.add(vitals)
    db_session.commit()

    # Re-query in a fresh query
    retrieved_patient = db_session.execute(
        select(Patient).where(Patient.patient_id == "PERSIST-PAT-1")
    ).scalar_one()

    assert retrieved_patient.full_name == "Persistent Patient"
    assert retrieved_patient.calculated_age is not None
    assert retrieved_patient.calculated_age >= 36
    assert len(retrieved_patient.allergies) == 1
    assert retrieved_patient.allergies[0].substance == "Aspirin"
    assert len(retrieved_patient.medical_history) == 1
    assert retrieved_patient.medical_history[0].condition == "Allergic Rhinitis"
    assert len(retrieved_patient.encounters) == 1
    assert retrieved_patient.encounters[0].encounter_id == "PERSIST-ENC-1"
    assert len(retrieved_patient.encounters[0].vital_signs) == 1
    assert retrieved_patient.encounters[0].vital_signs[0].systolic_bp == 125.0
    assert retrieved_patient.encounters[0].vital_signs[0].spo2_percentage is None


def test_clinical_history_retention_policy(db_session):
    """Verifies that patients with clinical records are preserved via soft-deletion.

    Clinical history (allergies, encounters, vitals) is NEVER permanently destroyed.
    """
    patient = Patient(patient_id="RETAIN-PAT-1", full_name="Retention Candidate")
    db_session.add(patient)
    db_session.flush()

    allergy = Allergy(patient_id=patient.id, substance="Dust", verification_status="unverified")
    encounter = Encounter(encounter_id="RETAIN-ENC-1", patient_id=patient.id)
    db_session.add_all([allergy, encounter])
    db_session.flush()

    vitals = VitalSign(encounter_id=encounter.id, pulse_rate=80)
    db_session.add(vitals)
    db_session.commit()

    # Execute safe deletion/deactivation
    result = deactivate_or_delete_patient(db_session, patient)
    assert result["action"] == "deactivated"
    assert result["preserved"] is True

    # Patient record is deactivated (is_active=False) but NOT purged
    persisted_patient = db_session.execute(
        select(Patient).where(Patient.patient_id == "RETAIN-PAT-1")
    ).scalar_one()
    assert persisted_patient.is_active is False

    # Historical records are strictly preserved!
    assert db_session.execute(select(Allergy).where(Allergy.patient_id == patient.id)).scalar_one() is not None
    assert db_session.execute(select(Encounter).where(Encounter.patient_id == patient.id)).scalar_one() is not None
    assert db_session.execute(select(VitalSign).where(VitalSign.encounter_id == encounter.id)).scalar_one() is not None


def test_empty_patient_hard_deletion(db_session):
    """Verifies that an accidental empty patient registration (zero clinical records) can be safely purged."""
    empty_patient = Patient(patient_id="EMPTY-PAT-1", full_name="Empty Mistake Patient")
    db_session.add(empty_patient)
    db_session.commit()

    result = deactivate_or_delete_patient(db_session, empty_patient)
    assert result["action"] == "deleted"
    assert result["preserved"] is False

    assert db_session.execute(
        select(Patient).where(Patient.patient_id == "EMPTY-PAT-1")
    ).scalar_one_or_none() is None


def test_synthetic_data_provenance_and_idempotency(db_session):
    """Verifies that the synthetic data seeder explicitly marks records with is_synthetic=True and is idempotent."""
    stats1 = seed_synthetic_clinical_data(db_session)
    assert stats1["patients_created"] == 3
    assert stats1["encounters_created"] >= 3
    assert stats1["allergies_created"] >= 3
    assert stats1["history_created"] >= 3
    assert stats1["vitals_created"] >= 3

    # Verify synthetic provenance column
    seeded_patients = list(db_session.execute(select(Patient)).scalars().all())
    for p in seeded_patients:
        assert p.is_synthetic is True
        assert "Synthetic" in p.full_name
        assert p.patient_id.startswith("SYN-PAT-")

    seeded_encounters = list(db_session.execute(select(Encounter)).scalars().all())
    for e in seeded_encounters:
        assert e.is_synthetic is True

    # Second run must be idempotent: 0 duplicates
    stats2 = seed_synthetic_clinical_data(db_session)
    assert stats2["patients_created"] == 0
    assert stats2["patients_existing"] == 3
    assert stats2["encounters_created"] == 0
