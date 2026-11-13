from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.clinical_context import ClinicalContextResponse
from app.services.clinical_context import (
    ClinicalContextEncounterMismatchError,
    ClinicalContextEncounterNotFoundError,
    aggregate_clinical_context,
)

router = APIRouter(prefix="/patients", tags=["Clinical Context"])


@router.get(
    "/{patient_id}/clinical-context",
    response_model=ClinicalContextResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve consolidated clinical context",
    description=(
        "Aggregates patient demographics, categorized allergy profile, active and past "
        "medical conditions, current and past medications, latest available vital signs with units, "
        "chronological encounter timeline, and safety/completeness alerts into a single cohesive snapshot."
    ),
)
def get_patient_clinical_context(
    patient_id: str,
    encounter_id: str | None = Query(
        None,
        description="Optional encounter identifier to set as the reference consultation context.",
    ),
    db: Session = Depends(get_db),
):
    try:
        context = aggregate_clinical_context(
            db=db,
            patient_id=patient_id,
            requested_encounter_id=encounter_id,
        )
    except ClinicalContextEncounterMismatchError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except ClinicalContextEncounterNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    if not context:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_id}' not found.",
        )

    return context

