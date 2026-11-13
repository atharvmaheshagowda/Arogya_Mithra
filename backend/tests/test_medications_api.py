import pytest
from sqlalchemy import select

from app.models.patient import Patient


def test_create_catalogue_medication(client):
    """TEST 17 & 19: Register catalogue item and validate input."""
    payload = {
        "generic_name": "Atorvastatin",
        "brand_name": "Lipitor",
        "active_ingredients": ["atorvastatin"],
        "strength": "20 mg",
        "dosage_form": "tablet",
    }
    response = client.post("/api/v1/medications", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["generic_name"] == "Atorvastatin"
    assert data["brand_name"] == "Lipitor"
    assert "atorvastatin" in data["active_ingredients"]
    assert data["medication_id"].startswith("MED-")

    # Reject duplicate
    dup_res = client.post("/api/v1/medications", json={"medication_id": data["medication_id"], **payload})
    assert dup_res.status_code == 409


def test_reject_invalid_catalogue_payload(client):
    """TEST 17: Rejects empty generic name or empty active ingredients."""
    # Empty generic name
    res1 = client.post("/api/v1/medications", json={"generic_name": "", "active_ingredients": ["atorvastatin"]})
    assert res1.status_code == 422

    # Empty active ingredients list
    res2 = client.post("/api/v1/medications", json={"generic_name": "Valid Drug", "active_ingredients": []})
    assert res2.status_code == 422


def test_patient_medication_crud_and_persistence(client):
    """TEST 19 & 20: Add patient medication, retrieve with filter, and verify persistence."""
    # 1. Create Patient
    pat_res = client.post("/api/v1/patients", json={"full_name": "Med API Patient"})
    assert pat_res.status_code == 201
    patient_id = pat_res.json()["patient_id"]

    # 2. Add Active Medication (Dolo 650)
    med_res1 = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        json={"medication_id": "Dolo 650", "status": "active", "source": "opd_prescription", "is_synthetic": True},
    )
    assert med_res1.status_code == 201
    assert med_res1.json()["status"] == "active"
    assert med_res1.json()["is_synthetic"] is True

    # 3. Add Historical Medication (Metformin)
    med_res2 = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        json={"medication_id": "Metformin", "status": "historical", "source": "patient_reported"},
    )
    assert med_res2.status_code == 201
    assert med_res2.json()["status"] == "historical"

    # 4. Retrieve all medications
    list_res = client.get(f"/api/v1/patients/{patient_id}/medications")
    assert list_res.status_code == 200
    all_meds = list_res.json()
    assert len(all_meds) == 2

    # 5. Retrieve with filter
    active_res = client.get(f"/api/v1/patients/{patient_id}/medications?status_filter=active")
    assert active_res.status_code == 200
    assert len(active_res.json()) == 1
    assert active_res.json()[0]["status"] == "active"


def test_patient_not_found_handling(client):
    """TEST 18: Nonexistent patient returns 404 on medication endpoints."""
    # Add medication for missing patient
    res1 = client.post("/api/v1/patients/NON-EXISTENT/medications", json={"medication_id": "Paracetamol"})
    assert res1.status_code == 404

    # Get medications for missing patient
    res2 = client.get("/api/v1/patients/NON-EXISTENT/medications")
    assert res2.status_code == 404

    # Run safety check for missing patient
    res3 = client.post("/api/v1/patients/NON-EXISTENT/medication-safety-check", json={"proposed_medication": "Aspirin"})
    assert res3.status_code == 404


def test_inactive_patient_rejected_on_all_medication_endpoints(client, db_session):
    """REMEDIATION AUDIT-P3-001: Deactivated patients are rejected with HTTP 400 across all medication operations."""
    pat_res = client.post("/api/v1/patients", json={"full_name": "Deactivated Patient"})
    assert pat_res.status_code == 201
    patient_id = pat_res.json()["patient_id"]

    # Deactivate patient directly in database
    patient = db_session.execute(select(Patient).where(Patient.patient_id == patient_id)).scalar_one()
    patient.is_active = False
    db_session.commit()

    # 1. Attempt medication recording -> HTTP 400
    res_post = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        json={"medication_id": "Paracetamol", "status": "active"},
    )
    assert res_post.status_code == 400
    assert "deactivated" in res_post.json()["detail"].lower()

    # 2. Attempt medication retrieval -> HTTP 400
    res_get = client.get(f"/api/v1/patients/{patient_id}/medications")
    assert res_get.status_code == 400
    assert "deactivated" in res_get.json()["detail"].lower()

    # 3. Attempt medication safety check -> HTTP 400
    res_check = client.post(
        f"/api/v1/patients/{patient_id}/medication-safety-check",
        json={"proposed_medication": "Paracetamol"},
    )
    assert res_check.status_code == 400
    assert "deactivated" in res_check.json()["detail"].lower()


def test_duplicate_active_medication_rejected(client):
    """REMEDIATION AUDIT-P3-003: Rejects duplicate active prescriptions for the same medication with HTTP 409."""
    pat_res = client.post("/api/v1/patients", json={"full_name": "Duplicate Check Patient"})
    patient_id = pat_res.json()["patient_id"]

    # First active prescription
    res1 = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        json={"medication_id": "Dolo 650", "status": "active"},
    )
    assert res1.status_code == 201

    # Second identical active prescription -> Rejected with 409 Conflict
    res2 = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        json={"medication_id": "Dolo 650", "status": "active"},
    )
    assert res2.status_code == 409
    assert "already has an active prescription" in res2.json()["detail"]


def test_legitimate_different_prescriptions_allowed(client):
    """REMEDIATION AUDIT-P3-003: Allows historical/discontinued records and different medications."""
    pat_res = client.post("/api/v1/patients", json={"full_name": "Legitimate Prescriptions Patient"})
    patient_id = pat_res.json()["patient_id"]

    # Active Paracetamol
    res1 = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        json={"medication_id": "Paracetamol", "status": "active"},
    )
    assert res1.status_code == 201

    # Discontinued Metformin (past therapy) -> Allowed
    res2 = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        json={"medication_id": "Metformin", "status": "discontinued"},
    )
    assert res2.status_code == 201

    # Active Metformin (new active therapy) -> Allowed because previous was discontinued
    res3 = client.post(
        f"/api/v1/patients/{patient_id}/medications",
        json={"medication_id": "Metformin", "status": "active"},
    )
    assert res3.status_code == 201


def test_medication_safety_check_api_endpoint(client):
    """TEST 21: Full integration of /medication-safety-check API endpoint."""
    # Register patient with documented Penicillin allergy
    pat_payload = {
        "full_name": "Allergic OPD Patient",
        "allergies": [
            {
                "substance": "Penicillin",
                "reaction": "Anaphylaxis",
                "severity": "severe",
                "verification_status": "documented",
            }
        ],
    }
    pat_res = client.post("/api/v1/patients", json=pat_payload)
    assert pat_res.status_code == 201
    patient_id = pat_res.json()["patient_id"]

    # Prescribe active Warfarin
    client.post(
        f"/api/v1/patients/{patient_id}/medications",
        json={"medication_id": "Warfarin", "status": "active"},
    )

    # Check 1: Propose Augmentin (contains Amoxicillin -> Penicillin allergy conflict!)
    check_res1 = client.post(
        f"/api/v1/patients/{patient_id}/medication-safety-check",
        json={"proposed_medication": "Augmentin"},
    )
    assert check_res1.status_code == 200
    res_data1 = check_res1.json()
    assert res_data1["overall_status"] == "WARNING"
    assert any(f["rule_id"] == "ALLERGY-CONF-001" for f in res_data1["findings"])

    # Check 2: Propose Aspirin (DDI with active Warfarin!)
    check_res2 = client.post(
        f"/api/v1/patients/{patient_id}/medication-safety-check",
        json={"proposed_medication": "Aspirin"},
    )
    assert check_res2.status_code == 200
    res_data2 = check_res2.json()
    assert res_data2["overall_status"] == "WARNING"
    assert any(f["rule_id"] == "DDI-001" for f in res_data2["findings"])

    # Check 3: Propose Unrecognized drug
    check_res3 = client.post(
        f"/api/v1/patients/{patient_id}/medication-safety-check",
        json={"proposed_medication": "NonExistentDrug12345"},
    )
    assert check_res3.status_code == 200
    res_data3 = check_res3.json()
    assert res_data3["overall_status"] == "UNABLE_TO_VERIFY"
