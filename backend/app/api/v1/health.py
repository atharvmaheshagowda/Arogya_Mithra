from fastapi import APIRouter, Response, status

from app.core.config import settings
from app.database.session import check_db_connection

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

