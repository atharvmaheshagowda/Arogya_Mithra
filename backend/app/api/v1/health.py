from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import check_db_connection, get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health(response: Response):
    is_db_connected = check_db_connection()
    if is_db_connected:
        return {
            "status": "healthy",
            "service": f"{settings.PROJECT_NAME} Backend",
            "database": "connected",
            "version": settings.VERSION,
        }

    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "unhealthy",
        "service": f"{settings.PROJECT_NAME} Backend",
        "database": "disconnected",
        "version": settings.VERSION,
    }


@router.get("/stats")
def get_system_stats(db: Session = Depends(get_db)):
    from app.models.clinical_note import ClinicalSOAPNote
    from app.models.encounter import Encounter
    from app.models.patient import Patient

    total_patients = db.execute(select(func.count(Patient.id))).scalar() or 0
    total_encounters = db.execute(select(func.count(Encounter.id))).scalar() or 0
    pending_notes = db.execute(
        select(func.count(ClinicalSOAPNote.id)).where(ClinicalSOAPNote.status == "draft")
    ).scalar() or 0
    approved_notes = db.execute(
        select(func.count(ClinicalSOAPNote.id)).where(
            ClinicalSOAPNote.status.in_(["approved", "reviewed_with_edits"])
        )
    ).scalar() or 0

    return {
        "total_patients": total_patients,
        "total_encounters": total_encounters,
        "pending_notes": pending_notes,
        "approved_notes": approved_notes,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.LLM_MODEL,
    }

