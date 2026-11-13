from datetime import date, timedelta
import pytest


def test_create_valid_patient(client):
    """Verifies that a valid patient can be registered with auto-generated ID."""
    payload = {
        "full_name": "Naveen Gowda",
        "date_of_birth": "1992-05-14",
        "age": 34,
        "gender": "Male",
        "phone_number": "+91-98765-43210",
        "preferred_language": "Kannada",
    }
    response = client.post("/api/v1/patients", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Naveen Gowda"
    assert data["patient_id"].startswith("PAT-")
    assert data["age"] == 34
    assert data["preferred_language"] == "Kannada"
    assert data["is_synthetic"] is False
    assert data["is_active"] is True


def test_create_patient_with_custom_id(client):
    """Verifies creating a patient with a user-specified unique patient_id."""
    payload = {
        "patient_id": "TEST-PAT-100",
        "full_name": "Meera Iyer",
        "age": 29,
        "gender": "Female",
        "preferred_language": "English",
    }
    response = client.post("/api/v1/patients", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["patient_id"] == "TEST-PAT-100"


def test_reject_duplicate_patient_id(client):
    """Verifies rejection of duplicate patient identifiers with HTTP 409."""
    payload = {
        "patient_id": "DUP-PAT-001",
        "full_name": "First Patient",
    }
    res1 = client.post("/api/v1/patients", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/patients", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_reject_invalid_patient_payloads(client):
    """Verifies rejection of invalid fields (empty name, negative age, age > 130)."""
    # Empty full_name
    res = client.post("/api/v1/patients", json={"full_name": ""})
    assert res.status_code == 422

    # Negative age
    res = client.post("/api/v1/patients", json={"full_name": "Valid Name", "age": -5})
    assert res.status_code == 422

    # Implausible age
    res = client.post("/api/v1/patients", json={"full_name": "Valid Name", "age": 140})
    assert res.status_code == 422


def test_demographic_dob_age_source_of_truth(client):
    """Verifies clinical source-of-truth policy:

    1. Future DOB rejected.
    2. Contradictory DOB and age rejected (>1 year divergence).
    3. Missing age computed automatically from DOB.
    """
    # Future DOB
    future_date = (date.today() + timedelta(days=365)).isoformat()
    res_future = client.post(
        "/api/v1/patients",
        json={"full_name": "Future Baby", "date_of_birth": future_date},
    )
    assert res_future.status_code == 422

    # Conflicting DOB and age (DOB says born 1980 (~46yo), but intake says 15)
    res_conflict = client.post(
        "/api/v1/patients",
        json={
            "full_name": "Conflict Patient",
            "date_of_birth": "1980-01-01",
            "age": 15,
        },
    )
    assert res_conflict.status_code == 422

    # DOB provided without age -> age dynamically calculated
    res_calc = client.post(
        "/api/v1/patients",
        json={
            "full_name": "Auto Age Patient",
            "date_of_birth": "2000-01-01",
        },
    )
    assert res_calc.status_code == 201
    data = res_calc.json()
    assert data["age"] is not None
    assert data["age"] >= 26  # Year 2026


def test_get_patient_by_id(client):
    """Verifies retrieval of a registered patient and 404 for missing patient."""
    res_missing = client.get("/api/v1/patients/NON-EXISTENT")
    assert res_missing.status_code == 404

    create_res = client.post(
        "/api/v1/patients",
        json={"full_name": "Lakshmi Rao", "preferred_language": "Kannada"},
    )
    assert create_res.status_code == 201
    pat_id = create_res.json()["patient_id"]

    get_res = client.get(f"/api/v1/patients/{pat_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["patient_id"] == pat_id
    assert data["full_name"] == "Lakshmi Rao"
    assert "allergies" in data
    assert "medical_history" in data
    assert data["is_synthetic"] is False


def test_patient_with_allergies_and_history(client):
    """Verifies registering a patient with initial allergies and medical history."""
    payload = {
        "full_name": "Suresh Patel",
        "age": 45,
        "allergies": [
            {
                "substance": "Penicillin",
                "reaction": "Anaphylaxis",
                "severity": "severe",
                "verification_status": "documented",
            }
        ],
        "medical_history": [
            {
                "condition": "Asthma",
                "description": "Mild persistent asthma",
                "status": "active",
                "source": "patient_reported",
            }
        ],
    }
    create_res = client.post("/api/v1/patients", json=payload)
    assert create_res.status_code == 201
    pat_id = create_res.json()["patient_id"]

    get_res = client.get(f"/api/v1/patients/{pat_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert len(detail["allergies"]) == 1
    assert detail["allergies"][0]["substance"] == "Penicillin"
    assert detail["allergies"][0]["verification_status"] == "documented"
    assert len(detail["medical_history"]) == 1
    assert detail["medical_history"][0]["condition"] == "Asthma"
    assert detail["medical_history"][0]["status"] == "active"


def test_list_patients_pagination(client):
    """Verifies patient listing and pagination limit/skip behavior."""
    for i in range(5):
        client.post("/api/v1/patients", json={"full_name": f"Batch Patient {i}"})

    res_page1 = client.get("/api/v1/patients?skip=0&limit=2")
    assert res_page1.status_code == 200
    assert len(res_page1.json()) == 2

    res_page2 = client.get("/api/v1/patients?skip=2&limit=2")
    assert res_page2.status_code == 200
    assert len(res_page2.json()) == 2

    res_invalid_limit = client.get("/api/v1/patients?limit=150")
    assert res_invalid_limit.status_code == 422
