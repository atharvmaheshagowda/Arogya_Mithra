"""TC-15 Gemini Provider Error Handling Verification.

Verifies:
1. Mocked Gemini adapter returning HTTP 503 Service Unavailable.
2. Actual FastAPI SOAP generation endpoint returns sanitized HTTP 503 response.
3. No draft note is persisted in SQLite during provider error.
4. Pre-existing drafts remain untouched and are not mislabeled.
5. API keys (e.g. AIzaSy...) are never leaked in error response text or headers.
6. User can retry and succeed after provider recovers (201 Created).
7. Mocked HTTP 429 (Rate Limit) returns sanitized 429 response.
8. Mocked Timeout returns sanitized 504 Gateway Timeout response.
9. Zero live Gemini API requests and zero Git commands.
"""

import json
from unittest.mock import MagicMock
import httpx
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import Settings
from app.models.clinical_note import ClinicalSOAPNote
from app.services.adapters.gemini_adapter import GeminiSOAPAdapter
from app.services.soap_service import default_soap_service
from app.services.synthetic_data import seed_synthetic_clinical_data
from tests.test_clinical_notes import _seed_catalogue_for_notes

DUMMY_GEMINI_KEY = "AIzaSyDummySecretKeyForTestOnly12345"


@pytest.fixture
def gemini_settings():
    return Settings(
        LLM_PROVIDER="gemini",
        LLM_MODEL="gemini-3.5-flash-lite",
        GEMINI_API_KEY=DUMMY_GEMINI_KEY,
        LLM_TIMEOUT_SECONDS=30.0,
    )


@pytest.fixture
def seeded_db_context(db_session):
    """Seed synthetic clinical records and medication catalogue."""
    seed_synthetic_clinical_data(db_session)
    _seed_catalogue_for_notes(db_session)
    return db_session


def make_synthetic_soap_dict():
    """Build a valid synthetic SOAP payload dictionary."""
    return {
        "subjective": {
            "chief_complaint": "Persistent sore throat and cough for 3 days",
            "history_of_present_illness": "Patient reports sore throat and cough for 3 days.",
            "reported_symptoms": ["Sore throat", "Cough"],
            "pertinent_negatives": ["No fever", "No chest pain"],
            "evidence": [],
        },
        "objective": {
            "vital_signs_summary": "BP: 132/84 mmHg, HR: 82 bpm",
            "physical_examination": ["Mild pharyngeal erythema"],
            "investigations_reviewed": [],
            "evidence": [],
        },
        "assessment": {
            "primary_impression": "Acute Pharyngitis",
            "differential_diagnoses": ["Upper Respiratory Tract Infection"],
            "chronic_conditions_status": [],
            "evidence": [],
        },
        "plan": {
            "diagnostic_workup": [],
            "proposed_medications": ["Paracetamol 500mg tablet PRN"],
            "patient_instructions": ["Warm water gargles", "Rest"],
            "red_flag_warnings": ["Return if breathing difficulty develops"],
            "follow_up": "3 days if symptoms persist",
            "evidence": [],
        },
    }


class TestTC15GeminiProviderErrorHandling:
    """Test Case TC-15: Gemini API Provider Error Handling, Sanitization,

    Persistence Safety, and Recovery.
    """

    def test_tc15_gemini_503_service_unavailable_handling(
        self, client: TestClient, seeded_db_context, gemini_settings
    ):
        """TC-15 Step 1-4 & 8-10: Simulate HTTP 503 Service Unavailable."""
        db = seeded_db_context

        # 1. Count existing notes before test
        initial_notes_count = db.execute(select(ClinicalSOAPNote)).scalars().all()
        initial_count = len(initial_notes_count)

        # 2. Setup mocked Gemini client returning HTTP 503
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

        # Inject adapter
        default_soap_service.adapter = adapter_503
        try:
            # 3. Trigger actual FastAPI SOAP generation endpoint with valid patient & encounter
            payload = {
                "consultation_text": "Doctor: Ramesh, how are you? Patient: I have persistent sore throat for 3 days. No fever.",
                "patient_id": "SYN-PAT-001",
                "encounter_id": "SYN-ENC-001-B",
                "language_code": "en",
            }
            res = client.post("/api/v1/clinical-notes/generate", json=payload)

            # 4. Verify backend returns HTTP 503
            assert res.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

            # Verify sanitized error detail
            detail = res.json()["detail"]
            assert "temporarily unavailable" in detail.lower() or "503" in detail
            # Verify API key is NOT exposed anywhere in the response
            assert DUMMY_GEMINI_KEY not in res.text
            assert DUMMY_GEMINI_KEY not in str(res.headers)

            # 8. Verify no new draft note is persisted in SQLite
            notes_after = db.execute(select(ClinicalSOAPNote)).scalars().all()
            assert len(notes_after) == initial_count

            # 9. Verify existing drafts remain intact
            if initial_count > 0:
                for note in initial_notes_count:
                    persisted = db.execute(
                        select(ClinicalSOAPNote).where(ClinicalSOAPNote.id == note.id)
                    ).scalar_one_or_none()
                    assert persisted is not None
                    assert persisted.status == note.status

        finally:
            default_soap_service.adapter = None

    def test_tc15_gemini_429_rate_limiting_handling(
        self, client: TestClient, seeded_db_context, gemini_settings
    ):
        """TC-15 Additional: Simulate HTTP 429 Rate Limiting."""
        db = seeded_db_context
        initial_count = len(db.execute(select(ClinicalSOAPNote)).scalars().all())

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
                    "consultation_text": "Doctor: Patient complains of cough. Patient: Yes.",
                    "patient_id": "SYN-PAT-001",
                    "encounter_id": "SYN-ENC-001-B",
                    "language_code": "en",
                },
            )
            assert res.status_code == status.HTTP_429_TOO_MANY_REQUESTS
            assert "rate limit" in res.json()["detail"].lower()
            assert DUMMY_GEMINI_KEY not in res.text

            # Zero persisted records
            assert len(db.execute(select(ClinicalSOAPNote)).scalars().all()) == initial_count
        finally:
            default_soap_service.adapter = None

    def test_tc15_gemini_timeout_handling(
        self, client: TestClient, seeded_db_context, gemini_settings
    ):
        """TC-15 Additional: Simulate Gateway Timeout (504)."""
        db = seeded_db_context
        initial_count = len(db.execute(select(ClinicalSOAPNote)).scalars().all())

        mock_http_timeout = MagicMock(spec=httpx.Client)
        mock_http_timeout.post.side_effect = httpx.TimeoutException("Read timed out after 30.0s")

        adapter_timeout = GeminiSOAPAdapter(
            api_key=DUMMY_GEMINI_KEY,
            http_client=mock_http_timeout,
            max_retries=0,
            settings=gemini_settings,
        )

        default_soap_service.adapter = adapter_timeout
        try:
            res = client.post(
                "/api/v1/clinical-notes/generate",
                json={
                    "consultation_text": "Doctor: Patient complains of cough. Patient: Yes.",
                    "patient_id": "SYN-PAT-001",
                    "encounter_id": "SYN-ENC-001-B",
                    "language_code": "en",
                },
            )
            assert res.status_code == status.HTTP_504_GATEWAY_TIMEOUT
            assert "timed out" in res.json()["detail"].lower()
            assert DUMMY_GEMINI_KEY not in res.text

            # Zero persisted records
            assert len(db.execute(select(ClinicalSOAPNote)).scalars().all()) == initial_count
        finally:
            default_soap_service.adapter = None

    def test_tc15_user_recovery_after_error_resolved(
        self, client: TestClient, seeded_db_context, gemini_settings
    ):
        """TC-15 Step 11: Verify user can successfully generate a draft after error is resolved."""
        db = seeded_db_context
        initial_count = len(db.execute(select(ClinicalSOAPNote)).scalars().all())

        # Step 1: Encounter 503 error
        mock_http = MagicMock(spec=httpx.Client)
        mock_http.post.return_value = httpx.Response(
            status_code=503,
            json={"error": {"code": 503, "message": "Service Unavailable"}},
            request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
        )
        adapter = GeminiSOAPAdapter(
            api_key=DUMMY_GEMINI_KEY,
            http_client=mock_http,
            max_retries=0,
            settings=gemini_settings,
        )
        default_soap_service.adapter = adapter

        payload = {
            "consultation_text": "Doctor: Ramesh, how are you? Patient: I have persistent sore throat for 3 days. No fever.",
            "patient_id": "SYN-PAT-001",
            "encounter_id": "SYN-ENC-001-B",
            "language_code": "en",
        }

        try:
            res_fail = client.post("/api/v1/clinical-notes/generate", json=payload)
            assert res_fail.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

            # Database has no new records
            assert len(db.execute(select(ClinicalSOAPNote)).scalars().all()) == initial_count

            # Step 2: Provider recovers (simulated valid Gemini structured JSON response)
            synthetic_soap = make_synthetic_soap_dict()
            body = {
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": json.dumps(synthetic_soap)}],
                            "role": "model",
                        },
                        "finishReason": "STOP",
                    }
                ],
                "usageMetadata": {
                    "promptTokenCount": 100,
                    "candidatesTokenCount": 150,
                    "totalTokenCount": 250,
                },
            }
            mock_http.post.return_value = httpx.Response(
                status_code=200,
                json=body,
                request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
            )

            # Step 3: Clinician retries generation
            res_success = client.post("/api/v1/clinical-notes/generate", json=payload)
            assert res_success.status_code == status.HTTP_201_CREATED
            data = res_success.json()

            # Note is properly populated
            assert data["patient_id"] == "SYN-PAT-001"
            assert data["encounter_id"] == "SYN-ENC-001-B"
            assert data["status"] == "draft"
            assert data["is_ai_generated"] is True
            assert "AI-GENERATED CLINICAL DRAFT" in data["disclaimer"]
            assert data["soap"]["subjective"]["chief_complaint"] == "Persistent sore throat and cough for 3 days"
            assert DUMMY_GEMINI_KEY not in res_success.text

            # Database now has exactly 1 new record persisted
            notes_after = db.execute(select(ClinicalSOAPNote)).scalars().all()
            assert len(notes_after) == initial_count + 1

            persisted_note = db.execute(
                select(ClinicalSOAPNote).where(ClinicalSOAPNote.note_id == data["note_id"])
            ).scalar_one_or_none()
            assert persisted_note is not None
            assert persisted_note.patient_identifier == "SYN-PAT-001"
            assert persisted_note.encounter_identifier == "SYN-ENC-001-B"

        finally:
            default_soap_service.adapter = None

    def test_tc15_credential_never_leaked_in_any_provider_failure(
        self, client: TestClient, seeded_db_context, gemini_settings
    ):
        """TC-15 Step 10: Verify API key is NEVER leaked in logs, responses, or error details across multiple status codes."""
        test_statuses = [
            (400, "Bad Request with key snippet AIzaSyDummySecretKeyForTestOnly12345 in body"),
            (401, "Unauthorized - API key invalid"),
            (403, "Forbidden - Project denied access"),
            (404, "Model not found"),
            (500, "Internal Server Error from Google GenAI"),
            (503, "Service Unavailable"),
        ]

        payload = {
            "consultation_text": "Doctor: Patient has cough. Patient: Yes.",
            "patient_id": "SYN-PAT-001",
            "encounter_id": "SYN-ENC-001-B",
            "language_code": "en",
        }

        for err_code, raw_msg in test_statuses:
            mock_http = MagicMock(spec=httpx.Client)
            mock_http.post.return_value = httpx.Response(
                status_code=err_code,
                text=f'{{"error": {{"code": {err_code}, "message": "{raw_msg}"}}}}',
                request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
            )
            adapter = GeminiSOAPAdapter(
                api_key=DUMMY_GEMINI_KEY,
                http_client=mock_http,
                max_retries=0,
                settings=gemini_settings,
            )
            default_soap_service.adapter = adapter
            try:
                res = client.post("/api/v1/clinical-notes/generate", json=payload)
                assert res.status_code in {400, 429, 502, 503, 504}
                assert DUMMY_GEMINI_KEY not in res.text
                assert DUMMY_GEMINI_KEY not in str(res.headers)
            finally:
                default_soap_service.adapter = None

