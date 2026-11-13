import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.allergy import Allergy
from app.models.encounter import Encounter
from app.models.medical_history import MedicalHistory
from app.models.patient import Patient
from app.schemas.patient import PatientCreate


class ClinicalHistoryRetentionError(Exception):
    """Raised when hard-deletion is attempted on a patient with retained clinical records."""
    pass


def generate_patient_id() -> str:
    """Generates a unique human-readable patient identifier."""
    prefix = datetime.now().strftime("%Y%m%d")
    short_hash = uuid.uuid4().hex[:6].upper()
    return f"PAT-{prefix}-{short_hash}"


def get_patient_by_identifier(db: Session, patient_id: str) -> Patient | None:
    """Fetches a patient by their unique patient_id string with allergies and history preloaded."""
    stmt = (
        select(Patient)
        .where(Patient.patient_id == patient_id)
        .options(
            selectinload(Patient.allergies),
            selectinload(Patient.medical_history),
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def list_patients(db: Session, skip: int = 0, limit: int = 20) -> list[Patient]:
    """Lists active patients with pagination ordered by registration date."""
    stmt = (
        select(Patient)
        .where(Patient.is_active == True)  # noqa: E712 - filter soft-deleted patients
        .order_by(Patient.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def create_patient(db: Session, patient_in: PatientCreate) -> Patient:
    """Creates a new patient record with optional initial allergies and medical history."""
    patient_id = patient_in.patient_id or generate_patient_id()

    patient = Patient(
        patient_id=patient_id,
        full_name=patient_in.full_name,
        date_of_birth=patient_in.date_of_birth,
        age=patient_in.age,
        gender=patient_in.gender,
        phone_number=patient_in.phone_number,
        preferred_language=patient_in.preferred_language or "English",
        is_synthetic=patient_in.is_synthetic,
        is_active=True,
    )
    db.add(patient)
    db.flush()

    for allergy_in in patient_in.allergies:
        allergy = Allergy(
            patient_id=patient.id,
            substance=allergy_in.substance,
            reaction=allergy_in.reaction,
            severity=allergy_in.severity,
            verification_status=allergy_in.verification_status.value,
        )
        db.add(allergy)

    for history_in in patient_in.medical_history:
        history = MedicalHistory(
            patient_id=patient.id,
            condition=history_in.condition,
            description=history_in.description,
            status=history_in.status.value,
            onset_date=history_in.onset_date,
            source=history_in.source,
        )
        db.add(history)

    db.commit()
    db.refresh(patient)
    return patient


def get_patient_encounter_history(db: Session, patient_internal_id: int) -> list[Encounter]:
    """Retrieves encounters for a patient in chronological order, preloading vital signs."""
    stmt = (
        select(Encounter)
        .where(Encounter.patient_id == patient_internal_id)
        .options(selectinload(Encounter.vital_signs))
        .order_by(Encounter.consultation_date.asc(), Encounter.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


def deactivate_or_delete_patient(db: Session, patient: Patient) -> dict:
    """Enforces clinical data retention policy:

    1. If the patient has any clinical records (encounters, allergies, or history),
       permanent deletion is blocked; the patient is soft-deleted (is_active=False).
    2. If the patient has zero clinical records, hard deletion is safely permitted.
    """
    has_encounters = len(patient.encounters) > 0
    has_allergies = len(patient.allergies) > 0
    has_history = len(patient.medical_history) > 0

    if has_encounters or has_allergies or has_history:
        patient.is_active = False
        db.commit()
        return {"action": "deactivated", "patient_id": patient.patient_id, "preserved": True}

    db.delete(patient)
    db.commit()
    return {"action": "deleted", "patient_id": patient.patient_id, "preserved": False}
