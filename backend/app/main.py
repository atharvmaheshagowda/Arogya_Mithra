from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.clinical_notes import router as clinical_notes_router
from app.api.v1.encounters import router as encounters_router
from app.api.v1.health import router as health_router
from app.api.v1.medications import router as medications_router
from app.api.v1.patients import router as patients_router
from app.core.config import settings
from app.database.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables safely without modifying existing data
    from app.database.session import engine as current_engine

    init_db(current_engine)
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
app.include_router(clinical_notes_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "message": "Backend is running",
        "version": settings.VERSION,
    }
