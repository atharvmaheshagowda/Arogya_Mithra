from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.encounter import (
    EncounterCreate,
    EncounterDetailResponse,
    EncounterResponse,
)
from app.schemas.vital_sign import VitalSignCreate, VitalSignResponse
from app.services import encounter_service, patient_service

router = APIRouter(prefix="/encounters", tags=["Encounters"])


@router.post(
    "",
    response_model=EncounterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new outpatient encounter",
    description="Creates a clinical encounter for an existing patient.",
)
def create_encounter(
    encounter_in: EncounterCreate,
    db: Session = Depends(get_db),
):
    patient = patient_service.get_patient_by_identifier(db, encounter_in.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{encounter_in.patient_id}' not found.",
        )

    if encounter_in.encounter_id:
        existing = encounter_service.get_encounter_by_identifier(
            db, encounter_in.encounter_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Encounter with ID '{encounter_in.encounter_id}' already exists.",
            )

    return encounter_service.create_encounter(db, encounter_in, patient)


@router.get(
    "/{encounter_id}",
    response_model=EncounterDetailResponse,
    summary="Retrieve encounter details",
    description="Retrieves a specific encounter including its captured vital signs.",
)
def get_encounter(
    encounter_id: str,
    db: Session = Depends(get_db),
):
    encounter = encounter_service.get_encounter_by_identifier(db, encounter_id)
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Encounter '{encounter_id}' not found.",
        )
    return encounter


@router.post(
    "/{encounter_id}/vitals",
    response_model=VitalSignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record vital signs for an encounter",
    description="Records vital sign measurements for an existing clinical encounter. Unmeasured fields remain null.",
)
def record_encounter_vitals(
    encounter_id: str,
    vitals_in: VitalSignCreate,
    db: Session = Depends(get_db),
):
    encounter = encounter_service.get_encounter_by_identifier(db, encounter_id)
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Encounter '{encounter_id}' not found.",
        )

    return encounter_service.add_vital_signs_to_encounter(db, encounter, vitals_in)

