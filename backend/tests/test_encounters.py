from datetime import datetime, timedelta
import pytest


def test_create_encounter_success(client):
    """Verifies creating an encounter for an existing patient."""
    pat_res = client.post("/api/v1/patients", json={"full_name": "Encounter Test Patient"})
    assert pat_res.status_code == 201
    pat_id = pat_res.json()["patient_id"]

    enc_payload = {
        "patient_id": pat_id,
        "doctor_name": "Dr. Sudha Murthy",
        "chief_complaint": "Persistent headache and blurred vision",
        "status": "scheduled",
    }
    enc_res = client.post("/api/v1/encounters", json=enc_payload)
    assert enc_res.status_code == 201
    data = enc_res.json()
    assert data["encounter_id"].startswith("ENC-")
    assert data["doctor_name"] == "Dr. Sudha Murthy"
    assert data["chief_complaint"] == "Persistent headache and blurred vision"
    assert data["status"] == "scheduled"


def test_create_encounter_nonexistent_patient(client):
    """Verifies 404 rejection when creating an encounter for an unknown patient."""
    enc_payload = {
        "patient_id": "NON-EXISTENT-PAT",
        "doctor_name": "Dr. Sudha Murthy",
    }
    enc_res = client.post("/api/v1/encounters", json=enc_payload)
    assert enc_res.status_code == 404
    assert "not found" in enc_res.json()["detail"].lower()


def test_reject_duplicate_encounter_id(client):
    """Verifies rejection of duplicate encounter identifiers with HTTP 409."""
    pat_res = client.post("/api/v1/patients", json={"full_name": "Patient Alpha"})
    pat_id = pat_res.json()["patient_id"]

    payload = {
        "patient_id": pat_id,
        "encounter_id": "CUSTOM-ENC-001",
        "doctor_name": "Dr. Smith",
    }
    res1 = client.post("/api/v1/encounters", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/encounters", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_get_encounter_details(client):
    """Verifies retrieval of an encounter including vital signs and 404 handling."""
    # 404
    missing_res = client.get("/api/v1/encounters/NON-EXISTENT-ENC")
    assert missing_res.status_code == 404

    # Create patient and encounter
    pat_res = client.post("/api/v1/patients", json={"full_name": "Patient Beta"})
    pat_id = pat_res.json()["patient_id"]

    enc_res = client.post(
        "/api/v1/encounters",
        json={"patient_id": pat_id, "chief_complaint": "Fever"},
    )
    assert enc_res.status_code == 201
    enc_id = enc_res.json()["encounter_id"]

    get_res = client.get(f"/api/v1/encounters/{enc_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["encounter_id"] == enc_id
    assert data["chief_complaint"] == "Fever"
    assert "vital_signs" in data
    assert isinstance(data["vital_signs"], list)


def test_add_vital_signs_to_encounter(client):
    """Verifies recording valid vital signs and preserving nulls for unmeasured values."""
    pat_res = client.post("/api/v1/patients", json={"full_name": "Patient Gamma"})
    pat_id = pat_res.json()["patient_id"]
    enc_res = client.post("/api/v1/encounters", json={"patient_id": pat_id})
    enc_id = enc_res.json()["encounter_id"]

    vitals_payload = {
        "systolic_bp": 120.0,
        "diastolic_bp": 80.0,
        "pulse_rate": 72,
        "spo2_percentage": 98.5,
        # Intentionally leaving temperature, respiratory_rate, weight, height null
    }
    vitals_res = client.post(f"/api/v1/encounters/{enc_id}/vitals", json=vitals_payload)
    assert vitals_res.status_code == 201
    vitals_data = vitals_res.json()
    assert vitals_data["systolic_bp"] == 120.0
    assert vitals_data["diastolic_bp"] == 80.0
    assert vitals_data["pulse_rate"] == 72
    assert vitals_data["spo2_percentage"] == 98.5
    # Crucial: Unmeasured values remain null and are NOT replaced with zero
    assert vitals_data["temperature_celsius"] is None
    assert vitals_data["respiratory_rate"] is None
    assert vitals_data["weight_kg"] is None


def test_reject_invalid_vital_signs(client):
    """Verifies that out-of-range clinical vital signs are rejected with HTTP 422."""
    pat_res = client.post("/api/v1/patients", json={"full_name": "Patient Delta"})
    pat_id = pat_res.json()["patient_id"]
    enc_res = client.post("/api/v1/encounters", json={"patient_id": pat_id})
    enc_id = enc_res.json()["encounter_id"]

    # Negative pulse rate
    res1 = client.post(f"/api/v1/encounters/{enc_id}/vitals", json={"pulse_rate": -10})
    assert res1.status_code == 422

    # SpO2 > 100%
    res2 = client.post(f"/api/v1/encounters/{enc_id}/vitals", json={"spo2_percentage": 105.0})
    assert res2.status_code == 422

    # Systolic BP < 30 mmHg
    res3 = client.post(f"/api/v1/encounters/{enc_id}/vitals", json={"systolic_bp": 15.0})
    assert res3.status_code == 422


def test_get_patient_history_chronological(client):
    """Verifies that patient history returns encounters in chronological order."""
    pat_res = client.post("/api/v1/patients", json={"full_name": "History Test Patient"})
    pat_id = pat_res.json()["patient_id"]

    now = datetime.now()
    # Create encounter 1 (earlier)
    client.post(
        "/api/v1/encounters",
        json={
            "patient_id": pat_id,
            "encounter_id": "HIST-ENC-1",
            "chief_complaint": "Visit 1",
            "consultation_date": (now - timedelta(days=10)).isoformat(),
        },
    )
    # Create encounter 2 (later)
    client.post(
        "/api/v1/encounters",
        json={
            "patient_id": pat_id,
            "encounter_id": "HIST-ENC-2",
            "chief_complaint": "Visit 2",
            "consultation_date": (now - timedelta(days=2)).isoformat(),
        },
    )

    history_res = client.get(f"/api/v1/patients/{pat_id}/history")
    assert history_res.status_code == 200
    encounters = history_res.json()
    assert len(encounters) == 2
    assert encounters[0]["encounter_id"] == "HIST-ENC-1"
    assert encounters[1]["encounter_id"] == "HIST-ENC-2"

