import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.encounter import Encounter
from app.models.patient import Patient
from app.models.vital_sign import VitalSign
from app.schemas.encounter import EncounterCreate
from app.schemas.vital_sign import VitalSignCreate


def generate_encounter_id() -> str:
    """Generates a unique human-readable encounter identifier."""
    prefix = datetime.now().strftime("%Y%m%d")
    short_hash = uuid.uuid4().hex[:6].upper()
    return f"ENC-{prefix}-{short_hash}"


def get_encounter_by_identifier(db: Session, encounter_id: str) -> Encounter | None:
    """Fetches an encounter by its unique encounter_id string with vital signs preloaded."""
    stmt = (
        select(Encounter)
        .where(Encounter.encounter_id == encounter_id)
        .options(selectinload(Encounter.vital_signs))
    )
    return db.execute(stmt).scalar_one_or_none()


def create_encounter(
    db: Session, encounter_in: EncounterCreate, patient: Patient
) -> Encounter:
    """Creates a clinical encounter linked to an existing patient."""
    encounter_id = encounter_in.encounter_id or generate_encounter_id()
    consultation_date = encounter_in.consultation_date or datetime.now()

    encounter = Encounter(
        encounter_id=encounter_id,
        patient_id=patient.id,
        doctor_name=encounter_in.doctor_name,
        chief_complaint=encounter_in.chief_complaint,
        consultation_date=consultation_date,
        status=encounter_in.status.value,
    )
    db.add(encounter)
    db.commit()
    db.refresh(encounter)
    return encounter


def add_vital_signs_to_encounter(
    db: Session, encounter: Encounter, vitals_in: VitalSignCreate
) -> VitalSign:
    """Records vital signs for an encounter.

    Preserves missing values as None. Does not fabricate or default values to zero.
    """
    vitals = VitalSign(
        encounter_id=encounter.id,
        systolic_bp=vitals_in.systolic_bp,
        diastolic_bp=vitals_in.diastolic_bp,
        pulse_rate=vitals_in.pulse_rate,
        temperature_celsius=vitals_in.temperature_celsius,
        spo2_percentage=vitals_in.spo2_percentage,
        respiratory_rate=vitals_in.respiratory_rate,
        weight_kg=vitals_in.weight_kg,
        height_cm=vitals_in.height_cm,
    )
    db.add(vitals)
    db.commit()
    db.refresh(vitals)
    return vitals

