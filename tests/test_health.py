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
