from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.encounter import EncounterDetailResponse
from app.schemas.patient import (
    PatientCreate,
    PatientDetailResponse,
    PatientResponse,
    PatientUpdate,
)
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new patient",
    description="Registers a patient in Arogya Mithra. Rejects duplicate patient identifiers.",
)
def register_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
):
    if patient_in.patient_id:
        existing = patient_service.get_patient_by_identifier(db, patient_in.patient_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Patient with ID '{patient_in.patient_id}' already exists.",
            )

    return patient_service.create_patient(db, patient_in)


@router.get(
    "",
    response_model=list[PatientResponse],
    summary="List registered patients",
    description="Retrieves a paginated list of patients.",
)
def get_patients(
    skip: int = Query(0, ge=0, description="Records to skip for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return (up to 100)"),
    db: Session = Depends(get_db),
):
    return patient_service.list_patients(db, skip=skip, limit=limit)


@router.get(
    "/{patient_id}",
    response_model=PatientDetailResponse,
    summary="Retrieve patient details",
    description="Fetches a patient by human-readable patient_id, including documented allergies and medical history.",
)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
):
    patient = patient_service.get_patient_by_identifier(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_id}' not found.",
        )
    return patient


@router.get(
    "/{patient_id}/history",
    response_model=list[EncounterDetailResponse],
    summary="Retrieve patient encounter history",
    description="Returns all outpatient encounters for a patient in chronological order, including associated vital signs.",
)
def get_patient_history(
    patient_id: str,
    db: Session = Depends(get_db),
):
    patient = patient_service.get_patient_by_identifier(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_id}' not found.",
        )

    return patient_service.get_patient_encounter_history(db, patient.id)


@router.patch(
    "/{patient_id}",
    response_model=PatientDetailResponse,
    summary="Update patient demographic details",
    description="Updates existing patient demographics without altering stable identifiers, allergies, or clinical history.",
)
@router.put(
    "/{patient_id}",
    response_model=PatientDetailResponse,
    summary="Update patient demographic details",
    description="Updates existing patient demographics without altering stable identifiers, allergies, or clinical history.",
)
def update_patient(
    patient_id: str,
    patient_in: PatientUpdate,
    db: Session = Depends(get_db),
):
    patient = patient_service.update_patient(db, patient_id, patient_in)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_id}' not found.",
        )
    return patient


