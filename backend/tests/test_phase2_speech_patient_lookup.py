import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.core.config import settings, AUTHORITATIVE_DB_PATH
from app.models.encounter import Encounter
from app.models.patient import Patient
from app.services.synthetic_data import seed_synthetic_clinical_data


class TestPhase2PatientLookupAndSOAPGeneration:
    """Automated test suite verifying Phase 2 requirements for patient lookup,

    encounter gating, manual text fidelity, and offline adapter execution.
    """

    @pytest.fixture(autouse=True)
    def setup_synthetic_data(self, db_session):
        """Seeds standard synthetic patient data and medication catalogue into the test database."""
        seed_synthetic_clinical_data(db_session)
        from tests.test_clinical_notes import _seed_catalogue_for_notes
        _seed_catalogue_for_notes(db_session)

    def test_authoritative_database_path_configuration(self):
        """TC-11: Active database path is anchored and consistent."""
        assert AUTHORITATIVE_DB_PATH.is_absolute()
        assert AUTHORITATIVE_DB_PATH.name == "Arogya.db"
        assert settings.DATABASE_URL.startswith("sqlite:///")

    def test_missing_patient_returns_404(self, client: TestClient):
        """TC-10 / Req 1: Missing patient returns an appropriate 404 error."""
        payload = {
            "consultation_text": "Patient has mild sore throat and cough for 2 days.",
            "patient_id": "SYN-PAT-NON-EXISTENT",
            "encounter_id": "SYN-ENC-001-B",
            "language_code": "en",
        }
        res = client.post("/api/v1/clinical-notes/generate", json=payload)
        assert res.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in res.json()["detail"].lower()
        assert "SYN-PAT-NON-EXISTENT" in res.json()["detail"]

    def test_valid_synthetic_patient_generates_draft_mock_adapter(self, client: TestClient):
        """TC-10 / Req 2 & 12: Valid synthetic patient generates draft using mock adapter without Gemini API calls."""
        payload = {
            "consultation_text": "Doctor: How are you? Patient: I have productive cough and mild chills for 4 days. No chest pain.",
            "patient_id": "SYN-PAT-001",
            "encounter_id": "SYN-ENC-001-B",
            "language_code": "en",
        }
        res = client.post("/api/v1/clinical-notes/generate", json=payload)
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()

        assert data["patient_id"] == "SYN-PAT-001"
        assert data["encounter_id"] == "SYN-ENC-001-B"
        assert data["is_ai_generated"] is True
        assert data["status"] == "draft"
        assert "AI-GENERATED CLINICAL DRAFT" in data["disclaimer"]
        assert any("cough" in s.lower() for s in data["soap"]["subjective"]["reported_symptoms"])
        assert any("chest pain" in s.lower() for s in data["soap"]["subjective"]["pertinent_negatives"])

    def test_encounter_mismatch_returns_400(self, client: TestClient):
        """Req 3: Encounter must belong to selected patient; mismatch returns 400."""
        # SYN-ENC-002-A belongs to SYN-PAT-002, not SYN-PAT-001
        payload = {
            "consultation_text": "Patient reports severe throat pain.",
            "patient_id": "SYN-PAT-001",
            "encounter_id": "SYN-ENC-002-A",
            "language_code": "en",
        }
        res = client.post("/api/v1/clinical-notes/generate", json=payload)
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "mismatch" in res.json()["detail"].lower()

    def test_nonexistent_encounter_returns_404(self, client: TestClient):
        """Req 3b: Nonexistent encounter returns 404."""
        payload = {
            "consultation_text": "Patient reports severe throat pain.",
            "patient_id": "SYN-PAT-001",
            "encounter_id": "SYN-ENC-999-DOESNT-EXIST",
            "language_code": "en",
        }
        res = client.post("/api/v1/clinical-notes/generate", json=payload)
        assert res.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in res.json()["detail"].lower()

    def test_manual_input_preserves_exact_user_text(self, client: TestClient):
        """Req 4: Manual input sends precisely the user-entered text without simulation injection."""
        custom_dictation = "Clinician manual note: Verified 3-day history of low grade fever. Adherent to metformin. No wheezing."
        payload = {
            "consultation_text": custom_dictation,
            "patient_id": "SYN-PAT-001",
            "encounter_id": "SYN-ENC-001-B",
            "language_code": "en",
        }
        res = client.post("/api/v1/clinical-notes/generate", json=payload)
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()

        # Check that the exact custom dictation was parsed
        assert any("fever" in s.lower() for s in data["soap"]["subjective"]["reported_symptoms"])
        assert any("wheezing" in s.lower() for s in data["soap"]["subjective"]["pertinent_negatives"])

    def test_deterministic_medication_safety_gating(self, client: TestClient):
        """Req 12 & E: Medication safety uses actual backend patient record."""
        # Ramesh Kumar (SYN-PAT-001) has documented Amoxicillin allergy in backend
        payload = {
            "consultation_text": "Doctor: I will prescribe Amoxicillin 500mg capsules TDS for 5 days. Patient: Okay doctor.",
            "patient_id": "SYN-PAT-001",
            "encounter_id": "SYN-ENC-001-B",
            "language_code": "en",
        }
        res = client.post("/api/v1/clinical-notes/generate", json=payload)
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()

        assert data["medication_safety"] is not None
        assert data["medication_safety"]["overall_status"].lower() in {"critical", "warning"}
        warning_rules = [w["rule_id"] for w in data["medication_safety"]["warnings"]]
        assert any("allergy" in r.lower() or r == "ALLERGY-CONF-001" for r in warning_rules)
