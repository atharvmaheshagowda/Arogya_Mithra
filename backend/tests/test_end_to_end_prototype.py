"""End-to-End Prototype Integration Tests for Arogya Mithra.

Verifies the complete integration between:
1. React Frontend API Client contract and FastAPI Backend
2. Gemini SOAP Adapter (gemini-3.5-flash-lite) with mocked API responses
3. Synthetic Patient and Encounter Context Enrichment (SYN-PAT-001, SYN-ENC-001-B)
4. Deterministic Medication Safety Evaluation (Allergy Contraindication Interception)
5. Clinical Review, Edit, and Electronic Physician Sign-off Workflow
6. Offline Mock Provider backward compatibility
7. Provider failure handling without credential leakage or live network traffic
"""

import json
from unittest.mock import MagicMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.schemas.clinical_note import ClinicalNoteStatus, SOAPPayload
from app.services.adapters.gemini_adapter import GeminiSOAPAdapter
from app.services.soap_service import MANDATORY_DISCLAIMER, default_soap_service
from app.services.synthetic_data import seed_synthetic_clinical_data

DUMMY_GEMINI_KEY = "AIzaSyDummySecretKeyForTestOnly12345"


def make_gemini_api_response(soap_content: dict, status_code: int = 200) -> httpx.Response:
    """Build a synthetic Gemini REST API response containing structured JSON."""
    body = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": json.dumps(soap_content)}],
                    "role": "model",
                },
                "finishReason": "STOP",
            }
        ],
        "usageMetadata": {
            "promptTokenCount": 120,
            "candidatesTokenCount": 180,
            "totalTokenCount": 300,
        },
    }
    request = httpx.Request(
        "POST",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    )
    return httpx.Response(
        status_code=status_code,
        json=body,
        request=request,
    )


def make_synthetic_soap_dict(proposed_medications=None):
    """Build a realistic synthetic SOAP payload."""
    return {
        "subjective": {
            "chief_complaint": "Productive cough and evening chills with low-grade fever for 4 days",
            "history_of_present_illness": "Patient reports 4 days of productive cough with yellowish sputum and low-grade evening chills.",
            "reported_symptoms": ["Productive cough", "Evening chills", "Low-grade fever"],
            "pertinent_negatives": ["Denies chest pain", "Denies shortness of breath", "No hemoptysis"],
            "evidence": [
                {
                    "text": "Productive cough for 4 days",
                    "source_evidence": "4 days of productive cough",
                    "is_negated": False,
                    "uncertainty_qualifier": None,
                },
                {
                    "text": "Denies chest pain",
                    "source_evidence": "no chest pain",
                    "is_negated": True,
                    "uncertainty_qualifier": None,
                },
            ],
        },
        "objective": {
            "vital_signs_summary": "BP: 132/84 mmHg, HR: 82 bpm, Temp: 37.5 C, SpO2: 97%",
            "physical_examination": ["Pharyngeal congestion present", "Bilateral scattered rhonchi on auscultation"],
            "investigations_reviewed": ["Previous HbA1c 7.2% documented"],
            "evidence": [],
        },
        "assessment": {
            "primary_impression": "Acute Bronchitis (Suspected)",
            "differential_diagnoses": ["Upper Respiratory Tract Infection", "Viral Pharyngitis"],
            "chronic_conditions_status": ["Type 2 Diabetes Mellitus - active comorbidity", "Essential Hypertension - controlled"],
            "evidence": [],
        },
        "plan": {
            "diagnostic_workup": ["Complete blood count if fever persists past 48 hours"],
            "proposed_medications": proposed_medications or [
                "Tab Paracetamol 650mg SOS",
                "Cough expectorant syrup 10ml TID for 5 days",
            ],
            "patient_instructions": [
                "Adequate oral hydration and warm fluids",
                "Saline gargles twice daily",
            ],
            "red_flag_warnings": [
                "Return immediately if high fever, worsening chest tightness, or dyspnea develops",
            ],
            "follow_up": "Return in 5 days if cough does not resolve",
            "evidence": [],
        },
    }


@pytest.fixture
def seeded_db(db_session):
    """Seed synthetic clinical data into the isolated test database."""
    seed_synthetic_clinical_data(db_session)
    return db_session


@pytest.fixture
def gemini_settings():
    return Settings(
        LLM_PROVIDER="gemini",
        LLM_MODEL="gemini-3.5-flash-lite",
        GEMINI_API_KEY=DUMMY_GEMINI_KEY,
        LLM_TIMEOUT_SECONDS=30.0,
    )


class TestEndToEndPrototypeIntegration:
    """End-to-End integration test suite."""

    def test_e2e_gemini_soap_generation_success(self, client: TestClient, seeded_db, gemini_settings):
        """Test full flow: Frontend request -> Backend -> Gemini adapter -> SOAP draft + Safety."""
        synthetic_soap = make_synthetic_soap_dict()
        mock_http = MagicMock(spec=httpx.Client)
        mock_http.post.return_value = make_gemini_api_response(synthetic_soap)

        adapter = GeminiSOAPAdapter(
            api_key=DUMMY_GEMINI_KEY,
            http_client=mock_http,
            settings=gemini_settings,
        )
        default_soap_service.adapter = adapter

        try:
            payload = {
                "consultation_text": (
                    "Doctor: Namaskara Ramesh, what is the issue?\n"
                    "Patient: For 4 days I have productive cough and evening chills. No chest pain, no breathing difficulty.\n"
                    "Doctor: BP is 132/84, temp 37.5 C. Suspected acute bronchitis. Will prescribe paracetamol and cough syrup."
                ),
                "patient_id": "SYN-PAT-001",
                "encounter_id": "SYN-ENC-001-B",
                "language_code": "kn",
            }

            response = client.post("/api/v1/clinical-notes/generate", json=payload)
            assert response.status_code == 201

            data = response.json()
            assert data["status"] == "draft"
            assert data["is_ai_generated"] is True
            assert data["disclaimer"] == MANDATORY_DISCLAIMER
            assert data["patient_id"] == "SYN-PAT-001"
            assert data["encounter_id"] == "SYN-ENC-001-B"
            assert data["note_id"].startswith("NOTE-SYN-ENC-001-B-")

            # SOAP Sections verification
            soap = data["soap"]
            assert soap["subjective"]["chief_complaint"] == synthetic_soap["subjective"]["chief_complaint"]
            assert "Productive cough" in soap["subjective"]["reported_symptoms"]
            assert "Denies chest pain" in soap["subjective"]["pertinent_negatives"]
            assert "BP: 132/84" in soap["objective"]["vital_signs_summary"]
            assert "Acute Bronchitis (Suspected)" in soap["assessment"]["primary_impression"]
            assert len(soap["plan"]["proposed_medications"]) == 2

            # Background patient context separation verification
            assert data["patient_context"] is not None
            assert any("Diabetes" in c for c in data["patient_context"]["chronic_conditions"])

            # Deterministic medication safety report verification
            assert data["medication_safety"] is not None
            assert data["medication_safety"]["overall_status"].lower() in ("passed", "warning", "unable_to_verify", "critical")
        finally:
            default_soap_service.adapter = None

    def test_e2e_medication_safety_allergy_contraindication_interception(
        self, client: TestClient, seeded_db, gemini_settings
    ):
        """Verify deterministic safety engine catches allergy contraindications in proposed medications."""
        # Patient SYN-PAT-001 has documented Amoxicillin allergy!
        # Suppose the LLM incorrectly proposes Amoxicillin:
        unsafe_soap = make_synthetic_soap_dict(
            proposed_medications=["Tab Amoxicillin 500mg TID for 5 days", "Tab Paracetamol 650mg SOS"]
        )
        mock_http = MagicMock(spec=httpx.Client)
        mock_http.post.return_value = make_gemini_api_response(unsafe_soap)

        adapter = GeminiSOAPAdapter(
            api_key=DUMMY_GEMINI_KEY,
            http_client=mock_http,
            settings=gemini_settings,
        )
        default_soap_service.adapter = adapter

        try:
            payload = {
                "consultation_text": (
                    "Doctor: Patient reports cough for 4 days. Prescribing amoxicillin and paracetamol.\n"
                    "Patient: Understood doctor."
                ),
                "patient_id": "SYN-PAT-001",
                "encounter_id": "SYN-ENC-001-B",
                "language_code": "en",
            }

            response = client.post("/api/v1/clinical-notes/generate", json=payload)
            assert response.status_code == 201

            data = response.json()
            safety = data["medication_safety"]
            assert safety is not None
            # Must be flagged with medication safety warnings
            assert safety["overall_status"].upper() in ("CRITICAL", "WARNING")
            assert len(safety["warnings"]) > 0

            # Verify the allergy warning explicitly names Amoxicillin
            warning_texts = [
                (w.get("explanation") or w.get("message") or w.get("affected_medication") or "").lower()
                for w in safety["warnings"]
            ]
            assert any("amoxicillin" in text for text in warning_texts)
        finally:
            default_soap_service.adapter = None

    def test_e2e_doctor_review_and_approval_flow(
        self, client: TestClient, seeded_db, gemini_settings
    ):
        """Verify full doctor review workflow: Generate draft -> Amend/Review -> Approve & Sign."""
        synthetic_soap = make_synthetic_soap_dict()
        mock_http = MagicMock(spec=httpx.Client)
        mock_http.post.return_value = make_gemini_api_response(synthetic_soap)

        adapter = GeminiSOAPAdapter(
            api_key=DUMMY_GEMINI_KEY,
            http_client=mock_http,
            settings=gemini_settings,
        )
        default_soap_service.adapter = adapter

        try:
            gen_resp = client.post(
                "/api/v1/clinical-notes/generate",
                json={
                    "consultation_text": "Doctor: Consultation text for review flow test.\nPatient: Fever and cough.",
                    "patient_id": "SYN-PAT-001",
                    "encounter_id": "SYN-ENC-001-B",
                    "language_code": "en",
                },
            )
            assert gen_resp.status_code == 201
            note_id = gen_resp.json()["note_id"]

            # Step 1: Physician reviews with edits
            edited_payload = synthetic_soap.copy()
            edited_payload["plan"]["proposed_medications"] = ["Tab Azithromycin 500mg OD for 3 days"]

            review_payload = {
                "reviewing_doctor": "Dr. Anika Rao, MBBS, MD",
                "action": "reviewed_with_edits",
                "edited_soap": edited_payload,
                "doctor_comments": "Substituted macrolide for clinical safety.",
            }

            review_resp = client.patch(
                f"/api/v1/clinical-notes/{note_id}/review",
                json=review_payload,
            )
            assert review_resp.status_code == 200
            review_data = review_resp.json()
            assert review_data["status"] == "reviewed_with_edits"
            assert review_data["reviewing_doctor"] == "Dr. Anika Rao, MBBS, MD"
            assert review_data["edited_soap"] is not None

            # Step 2: Physician approves note
            approve_payload = {
                "reviewing_doctor": "Dr. Anika Rao, MBBS, MD",
                "action": "approved",
                "doctor_comments": "Final clinical verification complete.",
            }
            approve_resp = client.patch(
                f"/api/v1/clinical-notes/{note_id}/review",
                json=approve_payload,
            )
            assert approve_resp.status_code == 200
            approved_data = approve_resp.json()
            assert approved_data["status"] == "approved"
            assert approved_data["reviewed_at"] is not None

            # Step 3: Verify persistence via GET endpoint
            get_resp = client.get(f"/api/v1/clinical-notes/{note_id}")
            assert get_resp.status_code == 200
            persisted = get_resp.json()
            assert persisted["status"] == "approved"
            assert persisted["reviewing_doctor"] == "Dr. Anika Rao, MBBS, MD"
            assert persisted["edited_soap"]["plan"]["proposed_medications"] == ["Tab Azithromycin 500mg OD for 3 days"]

            # Step 4: Verify invalid review action is rejected (Pydantic validation)
            invalid_resp = client.patch(
                f"/api/v1/clinical-notes/{note_id}/review",
                json={
                    "reviewing_doctor": "Dr. Anika Rao",
                    "action": "unsupported_action",
                },
            )
            assert invalid_resp.status_code == 422

            # Step 5: Verify cannot reject an already approved note (business logic validation)
            re_review_resp = client.patch(
                f"/api/v1/clinical-notes/{note_id}/review",
                json={
                    "reviewing_doctor": "Dr. Another Doctor",
                    "action": "rejected",
                },
            )
            assert re_review_resp.status_code == 400
            assert "already been officially approved" in re_review_resp.json()["detail"].lower()

            # Step 6: Verify reviewed_with_edits without edited_soap payload is rejected
            missing_soap_resp = client.patch(
                f"/api/v1/clinical-notes/{note_id}/review",
                json={
                    "reviewing_doctor": "Dr. Another Doctor",
                    "action": "reviewed_with_edits",
                },
            )
            assert missing_soap_resp.status_code == 422
            assert "requires an 'edited_soap' payload" in missing_soap_resp.json()["detail"]
        finally:
            default_soap_service.adapter = None

    def test_e2e_existing_mock_provider_behavior(self, client: TestClient, seeded_db):
        """Verify LLM_PROVIDER=mock preserves offline deterministic behavior without network calls."""
        mock_settings = Settings(LLM_PROVIDER="mock")
        default_soap_service.adapter = None

        with patch("app.services.adapters.factory.default_settings", mock_settings):
            response = client.post(
                "/api/v1/clinical-notes/generate",
                json={
                    "consultation_text": (
                        "Patient: I have had a high fever and severe headache for three days. "
                        "Doctor: Any cough? Patient: No cough at all. Doctor: Take rest and paracetamol."
                    ),
                    "patient_id": "SYN-PAT-001",
                    "encounter_id": "SYN-ENC-001-B",
                    "language_code": "en",
                },
            )
            assert response.status_code == 201
            data = response.json()
            assert data["status"] == "draft"
            assert len(data["soap"]["subjective"]["reported_symptoms"]) > 0

    def test_e2e_gemini_failure_handling_and_no_credential_leak(
        self, client: TestClient, seeded_db, gemini_settings
    ):
        """Verify Gemini provider failures (429, 503) return safe HTTP errors without credential leaks."""
        # 1. Test Rate Limit (HTTP 429)
        mock_http_429 = MagicMock(spec=httpx.Client)
        mock_http_429.post.return_value = httpx.Response(
            status_code=429,
            json={"error": {"code": 429, "message": "Resource has been exhausted (e.g. check quota)."}},
            request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
        )
        adapter_429 = GeminiSOAPAdapter(
            api_key=DUMMY_GEMINI_KEY,
            http_client=mock_http_429,
            max_retries=0,
            settings=gemini_settings,
        )
        default_soap_service.adapter = adapter_429

        try:
            res = client.post(
                "/api/v1/clinical-notes/generate",
                json={
                    "consultation_text": "Doctor: Patient complains of severe sore throat for 3 days.\nPatient: Yes.",
                    "patient_id": "SYN-PAT-001",
                    "language_code": "en",
                },
            )
            assert res.status_code == 429
            assert DUMMY_GEMINI_KEY not in res.text
            assert "rate limit" in res.json()["detail"].lower()
        finally:
            default_soap_service.adapter = None

        # 2. Test Service Unavailable (HTTP 503)
        mock_http_503 = MagicMock(spec=httpx.Client)
        mock_http_503.post.return_value = httpx.Response(
            status_code=503,
            json={"error": {"code": 503, "message": "The service is temporarily unavailable."}},
            request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
        )
        adapter_503 = GeminiSOAPAdapter(
            api_key=DUMMY_GEMINI_KEY,
            http_client=mock_http_503,
            max_retries=0,
            settings=gemini_settings,
        )
        default_soap_service.adapter = adapter_503

        try:
            res = client.post(
                "/api/v1/clinical-notes/generate",
                json={
                    "consultation_text": "Doctor: Patient complains of severe sore throat for 3 days.\nPatient: Yes.",
                    "patient_id": "SYN-PAT-001",
                    "language_code": "en",
                },
            )
            assert res.status_code == 503
            assert DUMMY_GEMINI_KEY not in res.text
            assert "503" in res.json()["detail"] or "temporarily unavailable" in res.json()["detail"].lower()
        finally:
            default_soap_service.adapter = None

    def test_e2e_frontend_api_contract_structure(
        self, client: TestClient, seeded_db, gemini_settings
    ):
        """Verify the exact JSON structure matches the TypeScript interfaces in src/lib/api-client.ts."""
        synthetic_soap = make_synthetic_soap_dict()
        mock_http = MagicMock(spec=httpx.Client)
        mock_http.post.return_value = make_gemini_api_response(synthetic_soap)

        adapter = GeminiSOAPAdapter(
            api_key=DUMMY_GEMINI_KEY,
            http_client=mock_http,
            settings=gemini_settings,
        )
        default_soap_service.adapter = adapter

        try:
            res = client.post(
                "/api/v1/clinical-notes/generate",
                json={
                    "consultation_text": "Doctor: Contract test dialogue.\nPatient: All symptoms reported here.",
                    "patient_id": "SYN-PAT-001",
                    "encounter_id": "SYN-ENC-001-B",
                    "language_code": "en",
                },
            )
            assert res.status_code == 201
            d = res.json()

            # Root response fields required by TypeScript ClinicalSOAPNoteResponse
            required_root_keys = [
                "id", "note_id", "status", "is_ai_generated", "disclaimer",
                "consultation_text", "soap", "unextracted_or_missing",
                "created_at", "patient_context", "medication_safety",
            ]
            for key in required_root_keys:
                assert key in d, f"Missing required root key: {key}"

            # SOAPPayload section keys
            soap = d["soap"]
            for section in ["subjective", "objective", "assessment", "plan"]:
                assert section in soap, f"Missing SOAP section: {section}"

            # Specific fields needed by consultation-workspace
            assert "chief_complaint" in soap["subjective"]
            assert "reported_symptoms" in soap["subjective"]
            assert "pertinent_negatives" in soap["subjective"]
            assert "vital_signs_summary" in soap["objective"]
            assert "physical_examination" in soap["objective"]
            assert "primary_impression" in soap["assessment"]
            assert "differential_diagnoses" in soap["assessment"]
            assert "proposed_medications" in soap["plan"]
            assert "patient_instructions" in soap["plan"]
            assert "red_flag_warnings" in soap["plan"]
            assert "follow_up" in soap["plan"]

            # Medication safety keys
            safety = d["medication_safety"]
            assert "overall_status" in safety
            assert "warnings" in safety
            assert "unable_to_verify" in safety
        finally:
            default_soap_service.adapter = None
