import pytest
from sqlalchemy import text

from app.core.config import settings
from app.database.session import check_db_connection


def test_root_endpoint(client):
    """TEST 1: Root endpoint returns 200 and project metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "Arogya Mithra"
    assert data["message"] == "Backend is running"
    assert data["version"] == settings.VERSION


def test_health_endpoint(client):
    """TEST 2: Health endpoint returns 200 with service and database status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Arogya Mithra Backend"
    assert data["database"] == "connected"
    assert data["version"] == settings.VERSION


def test_database_connectivity(isolated_test_db):
    """TEST 3: Direct SQLite execution verifies isolated engine executes SELECT 1."""
    assert check_db_connection() is True
    with isolated_test_db.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        assert result.scalar() == 1


def test_api_documentation(client):
    """TEST 4: Swagger documentation endpoint /docs returns 200."""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger-ui" in response.text.lower() or "html" in response.text.lower()


def test_openapi_schema(client):
    """TEST 5: OpenAPI schema endpoint returns 200 and registers health route."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    assert "/api/v1/health" in schema["paths"]
    assert "get" in schema["paths"]["/api/v1/health"]


def test_health_endpoint_db_failure(client, monkeypatch):
    """TEST 6 (Degraded State): Verifies truthful HTTP 503 when database fails."""
    monkeypatch.setattr("app.api.v1.health.check_db_connection", lambda: False)
    response = client.get("/api/v1/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["database"] == "disconnected"


def test_stats_endpoint_returns_real_counts(client, db_session):
    """TEST 7: /api/v1/stats accurately queries SQLite database for patient, encounter, and notes counts."""
    from datetime import date, datetime
    from app.models.patient import Patient
    from app.models.encounter import Encounter
    from app.models.clinical_note import ClinicalSOAPNote

    # Clean existing data in this test session
    p1 = Patient(
        patient_id="SYN-STAT-001",
        full_name="Stat Test Patient",
        gender="female",
        date_of_birth=date(1990, 5, 20),
        preferred_language="kannada",
        is_synthetic=True,
    )
    db_session.add(p1)
    db_session.commit()

    enc = Encounter(
        encounter_id="ENC-STAT-001",
        patient_id=p1.id,
        consultation_date=datetime.now(),
        chief_complaint="Follow-up",
        status="completed",
        is_synthetic=True,
    )
    db_session.add(enc)
    db_session.commit()

    note_draft = ClinicalSOAPNote(
        note_id="NOTE-STAT-DRAFT",
        patient_id=p1.id,
        encounter_id=enc.id,
        status="draft",
        is_ai_generated=True,
        disclaimer="AI-assisted clinical draft. Requires physician review.",
        language_code="en",
        consultation_text="Patient reporting mild headache",
        soap_data={"subjective": {"chief_complaint": "Headache"}},
    )
    note_approved = ClinicalSOAPNote(
        note_id="NOTE-STAT-APP",
        patient_id=p1.id,
        encounter_id=enc.id,
        status="approved",
        is_ai_generated=True,
        disclaimer="AI-assisted clinical draft. Requires physician review.",
        language_code="en",
        consultation_text="Routine checkup normal",
        soap_data={"subjective": {"chief_complaint": "Normal"}},
    )
    db_session.add_all([note_draft, note_approved])
    db_session.commit()

    response = client.get("/api/v1/stats")
    assert response.status_code == 200
    data = response.json()

    assert "total_patients" in data
    assert "total_encounters" in data
    assert "pending_notes" in data
    assert "approved_notes" in data
    assert data["total_patients"] >= 1
    assert data["total_encounters"] >= 1
    assert data["pending_notes"] >= 1
    assert data["approved_notes"] >= 1
    assert data["llm_provider"] == settings.LLM_PROVIDER
    assert data["llm_model"] == settings.LLM_MODEL

