
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.clinical_context import router as clinical_context_router
from app.api.v1.clinical_notes import router as clinical_notes_router
from app.api.v1.documents import router as documents_router
from app.api.v1.encounters import router as encounters_router
from app.api.v1.health import router as health_router
from app.api.v1.medications import router as medications_router
from app.api.v1.patients import router as patients_router
from app.core.config import settings
from app.database.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables safely without modifying existing data
    from app.database.session import SessionLocal, engine as current_engine
    from app.services.synthetic_data import seed_synthetic_clinical_data

    init_db(current_engine)
    with SessionLocal() as db:
        seed_synthetic_clinical_data(db)
    yield


app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    description=(
        "AI-powered multilingual clinical copilot "
        "for OPD documentation and patient record intelligence."
    ),
    version=settings.VERSION,
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Development CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(patients_router, prefix=settings.API_V1_STR)
app.include_router(encounters_router, prefix=settings.API_V1_STR)
app.include_router(medications_router, prefix=settings.API_V1_STR)
app.include_router(clinical_context_router, prefix=settings.API_V1_STR)
app.include_router(clinical_notes_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "message": "Backend is running",
        "version": settings.VERSION,
    }


@app.get("/health")
def root_health():
    from app.database.session import check_db_connection
    is_db_connected = check_db_connection()
    return {
        "status": "healthy" if is_db_connected else "degraded",
        "database": "connected" if is_db_connected else "disconnected",
        "service": f"{settings.PROJECT_NAME} Backend",
        "version": settings.VERSION,
    }

