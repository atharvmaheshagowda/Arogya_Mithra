"""Automated tests for GeminiSOAPAdapter and factory integration.

All tests use strictly mocked HTTP calls (zero real external network traffic).
Verifies:
1. Adapter instantiation with valid configuration.
2. Adapter instantiation failing when GEMINI_API_KEY is missing.
3. Factory returns GeminiSOAPAdapter when LLM_PROVIDER=gemini and key is present.
4. Factory returns DeterministicMockSOAPAdapter when LLM_PROVIDER=mock.
5. Successful SOAP generation with mocked Gemini response (English).
6. Multilingual consultation: Kannada text with negation (ಇಲ್ಲ / ಆಗುತ್ತಿಲ್ಲ).
7. Multilingual consultation: Kanglish transliterated text (illa / aagthilla).
8. Multilingual consultation: Hindi text with negation (नहीं / नहीं है).
9. Multilingual consultation: Hinglish transliterated text (nahi / nahi hai).
10. Negation preservation: Negated symptoms MUST appear in pertinent_negatives and NEVER in reported_symptoms.
11. Diagnostic uncertainty: Suspected/probable diagnoses preserved in differential or marked with uncertainty.
12. Speaker attribution: Patient statements vs clinician findings distinguished.
13. Zero hallucination: Missing vitals/investigations are marked unavailable, not invented.
14. Error handling: HTTP 429 rate limit triggers exponential backoff retry.
15. Error handling: HTTP 401 invalid key fails immediately without retry.
16. Error handling: HTTP timeout produces clean, actionable error.
17. Error handling: Malformed JSON from Gemini is handled gracefully.
18. Security: API key is NEVER exposed in logs, exceptions, or payloads.
"""

import json
from unittest.mock import MagicMock, patch
import httpx
import pytest

from app.core.config import Settings
from app.schemas.clinical_note import SOAPGenerateRequest, SOAPPayload
from app.services.adapters.factory import (
    get_clinical_note_adapter,
)
from app.services.adapters.gemini_adapter import (
    GeminiAuthenticationError,
    GeminiConfigurationError,
    GeminiModelNotFoundError,
    GeminiRateLimitError,
    GeminiResponseParsingError,
    GeminiSOAPAdapter,
    GeminiServiceUnavailableError,
    GeminiTimeoutError,
    is_follow_up_grounded,
)
from app.services.adapters.mock_adapter import DeterministicMockSOAPAdapter


# ============================================================================
# Helpers & Synthetic Fixtures
# ============================================================================

DUMMY_KEY = "AIzaSyDummySecretKeyForTestOnly12345"


def make_gemini_api_response(soap_content: dict, status_code: int = 200) -> httpx.Response:
    """Build a synthetic Gemini REST API response containing JSON in candidates."""
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
            "promptTokenCount": 100,
            "candidatesTokenCount": 150,
            "totalTokenCount": 250,
        },
    }
    request = httpx.Request("POST", "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent")
    return httpx.Response(
        status_code=status_code,
        json=body,
        request=request,
    )


def make_sample_soap_dict(
    chief_complaint="Fever and body ache for 3 days",
    reported_symptoms=None,
    pertinent_negatives=None,
    primary_impression="Acute viral pyrexia",
    differentials=None,
    vital_signs_summary="Temp 101.2 F, HR 88 bpm",
    medications=None,
):
    return {
        "subjective": {
            "chief_complaint": chief_complaint,
            "history_of_present_illness": "Patient presents with fever and generalised malaise.",
            "reported_symptoms": reported_symptoms or ["Fever", "Body ache"],
            "pertinent_negatives": pertinent_negatives or ["Denies cough", "Denies chest pain"],
            "evidence": [
                {
                    "text": "Fever for 3 days",
                    "source_evidence": "fever for 3 days",
                    "is_negated": False,
                    "uncertainty_qualifier": None,
                }
            ],
        },
        "objective": {
            "vital_signs_summary": vital_signs_summary,
            "physical_examination": ["Throat clear, chest clear to auscultation"],
            "investigations_reviewed": [],
            "evidence": [],
        },
        "assessment": {
            "primary_impression": primary_impression,
            "differential_diagnoses": differentials or ["Viral syndrome", "Dengue fever (suspected)"],
            "chronic_conditions_status": [],
            "evidence": [],
        },
        "plan": {
            "diagnostic_workup": ["Complete Blood Count (CBC)"],
            "proposed_medications": medications or ["Paracetamol 650mg SOS"],
            "patient_instructions": ["Adequate oral hydration, rest"],
            "red_flag_warnings": ["Return immediately if severe abdominal pain or persistent vomiting"],
            "follow_up": "Review after 48 hours or if fever persists",
            "evidence": [],
        },
    }


# ============================================================================
# Test Cases (1 to 18)
# ============================================================================


def test_scenario_01_adapter_instantiation_valid():
    """1. Adapter instantiation with valid configuration."""
    adapter = GeminiSOAPAdapter(
        api_key=DUMMY_KEY,
        model="gemini-3.5-flash-lite",
        timeout=25.0,
    )
    assert adapter.model == "gemini-3.5-flash-lite"
    assert adapter.timeout == 25.0
    assert "AIzaSy" in repr(adapter)
    assert DUMMY_KEY not in repr(adapter)  # Key must be masked

    # Default model verification
    default_adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY)
    assert default_adapter.model == "gemini-3.5-flash-lite"


def test_scenario_02_adapter_instantiation_missing_key_fails(monkeypatch):
    """2. Adapter instantiation failing when GEMINI_API_KEY is missing."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)

    empty_settings = Settings(LLM_API_KEY=None, GEMINI_API_KEY=None)

    with pytest.raises(GeminiConfigurationError) as excinfo:
        GeminiSOAPAdapter(api_key=None, settings=empty_settings)

    assert "GEMINI_API_KEY is not configured" in str(excinfo.value)
    assert "LLM_PROVIDER='mock'" in str(excinfo.value)


def test_scenario_03_factory_returns_gemini_when_key_present():
    """3. Factory returns GeminiSOAPAdapter when LLM_PROVIDER=gemini and key is present."""
    settings = Settings(
        LLM_PROVIDER="gemini",
        GEMINI_API_KEY=DUMMY_KEY,
        LLM_MODEL="gemini-3.5-flash-lite",
    )
    adapter = get_clinical_note_adapter(settings)
    assert isinstance(adapter, GeminiSOAPAdapter)
    assert adapter.model == "gemini-3.5-flash-lite"


def test_scenario_04_factory_returns_mock_when_provider_is_mock():
    """4. Factory returns DeterministicMockSOAPAdapter when LLM_PROVIDER=mock."""
    settings = Settings(LLM_PROVIDER="mock")
    adapter = get_clinical_note_adapter(settings)
    assert isinstance(adapter, DeterministicMockSOAPAdapter)


def test_scenario_05_successful_soap_generation_english():
    """5. Successful SOAP generation with mocked Gemini response (English)."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient reports fever and headache for 3 days. Denies cough. Vitals: Temp 101F.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert isinstance(payload, SOAPPayload)
    assert payload.subjective.chief_complaint == sample_soap["subjective"]["chief_complaint"]
    assert "Fever" in payload.subjective.reported_symptoms
    assert "Denies cough" in payload.subjective.pertinent_negatives
    assert payload.assessment.primary_impression == "Acute viral pyrexia"
    assert "Paracetamol 650mg SOS" in payload.plan.proposed_medications
    mock_client.post.assert_called_once()


def test_scenario_06_multilingual_kannada_negation():
    """6. Multilingual consultation: Kannada text with negation (ಇಲ್ಲ / ಆಗುತ್ತಿಲ್ಲ)."""
    mock_client = MagicMock(spec=httpx.Client)
    kannada_soap = make_sample_soap_dict(
        chief_complaint="ಜ್ವರ ಮತ್ತು ತಲೆನೋವು",
        reported_symptoms=["ಜ್ವರ (fever)", "ತಲೆನೋವು (headache)"],
        pertinent_negatives=["ವಾಂತಿ ಇಲ್ಲ (no vomiting)", "ಆಯಾಸ ಆಗುತ್ತಿಲ್ಲ"],
        primary_impression="ವೈರಲ್ ಜ್ವರ (Viral pyrexia)",
    )
    mock_client.post.return_value = make_gemini_api_response(kannada_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="ರೋಗಿಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಇದೆ. ವಾಂತಿ ಇಲ್ಲ. ಯಾವುದೇ ಆಯಾಸ ಆಗುತ್ತಿಲ್ಲ.",
        language_code="kn",
    )
    payload = adapter.generate_soap_note(req)

    assert isinstance(payload, SOAPPayload)
    assert any("ಜ್ವರ" in s for s in payload.subjective.reported_symptoms)
    # Check that negated Kannada terms are in pertinent negatives
    assert any("ಇಲ್ಲ" in n or "ಆಗುತ್ತಿಲ್ಲ" in n for n in payload.subjective.pertinent_negatives)
    # Negated items must NOT be in reported symptoms
    assert not any("ವಾಂತಿ ಇಲ್ಲ" in s for s in payload.subjective.reported_symptoms)


def test_scenario_07_multilingual_kanglish_negation():
    """7. Multilingual consultation: Kanglish transliterated text (illa / aagthilla)."""
    mock_client = MagicMock(spec=httpx.Client)
    kanglish_soap = make_sample_soap_dict(
        chief_complaint="Jwara and talenovu since 2 days",
        reported_symptoms=["Jwara", "Talenovu"],
        pertinent_negatives=["Vomiting illa", "Chest pain aagthilla"],
        primary_impression="Viral fever",
    )
    mock_client.post.return_value = make_gemini_api_response(kanglish_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient says jwara and talenovu since 2 days. Vomiting illa, chest pain aagthilla.",
        language_code="kn",
    )
    payload = adapter.generate_soap_note(req)

    assert isinstance(payload, SOAPPayload)
    assert "Jwara" in payload.subjective.reported_symptoms
    assert any("illa" in n.lower() or "vomiting" in n.lower() for n in payload.subjective.pertinent_negatives)
    assert not any("vomiting" in s.lower() for s in payload.subjective.reported_symptoms)


def test_scenario_08_multilingual_hindi_negation():
    """8. Multilingual consultation: Hindi text with negation (नहीं / नहीं है)."""
    mock_client = MagicMock(spec=httpx.Client)
    hindi_soap = make_sample_soap_dict(
        chief_complaint="दो दिन से तेज़ बुखार",
        reported_symptoms=["बुखार (Fever)", "बदन दर्द (Body ache)"],
        pertinent_negatives=["उल्टी नहीं है (No vomiting)", "खांसी नहीं हो रही"],
        primary_impression="वायरल बुखार (Viral fever)",
    )
    mock_client.post.return_value = make_gemini_api_response(hindi_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="मरीज़ को दो दिन से तेज़ बुखार और बदन दर्द है। उल्टी नहीं है और खांसी नहीं हो रही।",
        language_code="hi",
    )
    payload = adapter.generate_soap_note(req)

    assert isinstance(payload, SOAPPayload)
    assert any("बुखार" in s for s in payload.subjective.reported_symptoms)
    assert any("उल्टी नहीं" in n or "खांसी नहीं" in n for n in payload.subjective.pertinent_negatives)
    assert not any("उल्टी नहीं" in s for s in payload.subjective.reported_symptoms)


def test_scenario_09_multilingual_hinglish_negation():
    """9. Multilingual consultation: Hinglish transliterated text (nahi / nahi hai)."""
    mock_client = MagicMock(spec=httpx.Client)
    hinglish_soap = make_sample_soap_dict(
        chief_complaint="Bukhar and sar dard for 3 days",
        reported_symptoms=["Bukhar", "Sar dard"],
        pertinent_negatives=["Ultee nahi hai", "Chhathi me dard nahi"],
        primary_impression="Acute viral febrile illness",
    )
    mock_client.post.return_value = make_gemini_api_response(hinglish_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has bukhar and sar dard for 3 days. Ultee nahi hai, chhathi me dard nahi.",
        language_code="hi",
    )
    payload = adapter.generate_soap_note(req)

    assert isinstance(payload, SOAPPayload)
    assert "Bukhar" in payload.subjective.reported_symptoms
    assert any("ultee" in n.lower() or "nahi" in n.lower() for n in payload.subjective.pertinent_negatives)
    assert not any("ultee" in s.lower() for s in payload.subjective.reported_symptoms)


def test_scenario_10_post_processing_sanitizer_enforces_negation_safety():
    """10. Negation preservation: Erroneously reported negative symptoms are moved to pertinent_negatives."""
    mock_client = MagicMock(spec=httpx.Client)
    # Flawed response where the model accidentally put negated symptoms in reported_symptoms:
    flawed_soap = make_sample_soap_dict(
        reported_symptoms=["High fever", "Vomiting illa", "No nausea", "Chills nahi hai"],
        pertinent_negatives=["Denies chest pain"],
    )
    mock_client.post.return_value = make_gemini_api_response(flawed_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="High fever reported. Vomiting illa, no nausea, chills nahi hai.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    # Sanitizer MUST have removed negated items from reported_symptoms
    assert "High fever" in payload.subjective.reported_symptoms
    assert "Vomiting illa" not in payload.subjective.reported_symptoms
    assert "No nausea" not in payload.subjective.reported_symptoms
    assert "Chills nahi hai" not in payload.subjective.reported_symptoms

    # And added them to pertinent_negatives
    pert_neg_str = " ".join(payload.subjective.pertinent_negatives).lower()
    assert "vomiting" in pert_neg_str
    assert "nausea" in pert_neg_str
    assert "chills" in pert_neg_str


def test_scenario_11_diagnostic_uncertainty_preserved():
    """11. Diagnostic uncertainty: Suspected/probable diagnoses preserved."""
    mock_client = MagicMock(spec=httpx.Client)
    uncertain_soap = make_sample_soap_dict(
        primary_impression="Suspected Dengue Fever (provisional)",
        differentials=["Viral Hepatitis (rule out)", "Malaria (possible)"],
    )
    mock_client.post.return_value = make_gemini_api_response(uncertain_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="High fever with thrombocytopenia. Suspected dengue fever, rule out malaria.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "Suspected" in payload.assessment.primary_impression
    assert any("rule out" in d.lower() or "possible" in d.lower() for d in payload.assessment.differential_diagnoses)


def test_scenario_12_speaker_attribution():
    """12. Speaker attribution: Patient statements vs clinician findings distinguished."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    sample_soap["subjective"]["history_of_present_illness"] = "Patient reports intermittent fever and headache."
    sample_soap["objective"]["physical_examination"] = ["Clinician observed: Pharyngeal erythema present, abdomen soft"]
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Doctor notes pharyngeal erythema. Patient reports intermittent fever.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "Patient reports" in payload.subjective.history_of_present_illness
    assert any("Clinician observed" in f for f in payload.objective.physical_examination)


def test_scenario_13_zero_hallucination_missing_vitals():
    """13. Zero hallucination: Missing vitals remain unavailable, not fabricated."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict(
        vital_signs_summary="[Not documented]",
    )
    sample_soap["objective"]["physical_examination"] = []
    sample_soap["objective"]["investigations_reviewed"] = []
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient consulted for mild knee sprain. Advised crepe bandage.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert payload.objective.vital_signs_summary in ("[Not documented]", None)
    assert len(payload.objective.physical_examination) == 0
    assert len(payload.objective.investigations_reviewed) == 0


def test_scenario_14_error_handling_rate_limit_retry():
    """14. Error handling: HTTP 429 rate limit triggers exponential backoff retry."""
    mock_client = MagicMock(spec=httpx.Client)
    req_obj = httpx.Request("POST", "https://dummy.api")
    rate_limit_resp = httpx.Response(status_code=429, text="Rate limit exceeded", request=req_obj)
    success_resp = make_gemini_api_response(make_sample_soap_dict())

    # Return 429 on first call, 200 on second call
    mock_client.post.side_effect = [rate_limit_resp, success_resp]

    adapter = GeminiSOAPAdapter(
        api_key=DUMMY_KEY,
        http_client=mock_client,
        backoff_factor=0.01,  # fast backoff for tests
        max_retries=2,
    )
    req = SOAPGenerateRequest(
        consultation_text="Patient reports mild cough and cold.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert isinstance(payload, SOAPPayload)
    assert mock_client.post.call_count == 2

    # Now verify persistent 429 exceeds max_retries and raises GeminiRateLimitError
    mock_client.post.side_effect = [rate_limit_resp, rate_limit_resp, rate_limit_resp]
    with pytest.raises(GeminiRateLimitError):
        adapter.generate_soap_note(req)


def test_scenario_15_error_handling_auth_failure_immediate():
    """15. Error handling: HTTP 401 invalid key fails immediately without retry."""
    mock_client = MagicMock(spec=httpx.Client)
    req_obj = httpx.Request("POST", "https://dummy.api")
    auth_err_resp = httpx.Response(status_code=401, text="API key not valid", request=req_obj)
    mock_client.post.return_value = auth_err_resp

    adapter = GeminiSOAPAdapter(
        api_key=DUMMY_KEY,
        http_client=mock_client,
        max_retries=3,
    )
    req = SOAPGenerateRequest(
        consultation_text="Patient reports mild cough and cold.",
        language_code="en",
    )

    with pytest.raises(GeminiAuthenticationError) as excinfo:
        adapter.generate_soap_note(req)

    assert "authentication failed" in str(excinfo.value)
    # Must fail immediately on 1st call without retries
    assert mock_client.post.call_count == 1


def test_scenario_16_error_handling_timeout():
    """16. Error handling: HTTP timeout produces clean, actionable error."""
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.side_effect = httpx.TimeoutException("Connection timed out")

    adapter = GeminiSOAPAdapter(
        api_key=DUMMY_KEY,
        http_client=mock_client,
        timeout=10.0,
        backoff_factor=0.01,
        max_retries=1,
    )
    req = SOAPGenerateRequest(
        consultation_text="Patient reports mild cough and cold.",
        language_code="en",
    )

    with pytest.raises(GeminiTimeoutError) as excinfo:
        adapter.generate_soap_note(req)

    assert "timed out" in str(excinfo.value)
    assert "10.0s" in str(excinfo.value)


def test_scenario_17_error_handling_malformed_json():
    """17. Error handling: Malformed JSON from Gemini is handled gracefully."""
    mock_client = MagicMock(spec=httpx.Client)
    req_obj = httpx.Request("POST", "https://dummy.api")
    corrupt_body = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "NOT_JSON_AT_ALL {corrupt text here"}],
                    "role": "model",
                }
            }
        ]
    }
    mock_client.post.return_value = httpx.Response(status_code=200, json=corrupt_body, request=req_obj)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient reports mild cough and cold.",
        language_code="en",
    )

    with pytest.raises(GeminiResponseParsingError) as excinfo:
        adapter.generate_soap_note(req)

    assert "did not contain parseable JSON" in str(excinfo.value)


def test_scenario_18_security_api_key_never_exposed():
    """18. Security: API key is NEVER exposed in logs, exceptions, or payloads."""
    secret_key = "AIzaSySuperSecretClinicalKey998877"
    adapter = GeminiSOAPAdapter(api_key=secret_key)

    repr_str = repr(adapter)
    str_str = str(adapter)

    # Full secret key must not appear in string representations
    assert secret_key not in repr_str
    assert secret_key not in str_str
    assert "AIzaSy" in repr_str  # Masked preview is allowed
    assert "998877" not in repr_str

    # In exception messages, even with bad request from upstream
    mock_client = MagicMock(spec=httpx.Client)
    req_obj = httpx.Request("POST", "https://dummy.api")
    resp_with_key = httpx.Response(
        status_code=400,
        text=f"Invalid query parameter near key={secret_key}",
        request=req_obj,
    )
    mock_client.post.return_value = resp_with_key

    bad_adapter = GeminiSOAPAdapter(api_key=secret_key, http_client=mock_client)
    req = SOAPGenerateRequest(consultation_text="Test consultation", language_code="en")

    try:
        bad_adapter.generate_soap_note(req)
    except Exception as exc:
        err_msg = str(exc)
        assert secret_key not in err_msg
        assert "********" in err_msg


# ============================================================================
# Phase 5C.3A Remediation Tests (Findings F-01, F-02, F-03, F-04)
# ============================================================================


def test_scenario_19_safety_blocked_response():
    """19. Gemini safety-blocked response produces clear GeminiResponseParsingError."""
    mock_client = MagicMock(spec=httpx.Client)
    req_obj = httpx.Request("POST", "https://dummy.api")
    safety_body = {
        "candidates": [],
        "promptFeedback": {
            "blockReason": "SAFETY",
            "safetyRatings": [{"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "probability": "HIGH"}],
        },
    }
    mock_client.post.return_value = httpx.Response(status_code=200, json=safety_body, request=req_obj)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(consultation_text="Clinical consultation text", language_code="en")

    with pytest.raises(GeminiResponseParsingError) as excinfo:
        adapter.generate_soap_note(req)

    assert "zero candidates" in str(excinfo.value)
    assert "SAFETY" in str(excinfo.value)


def test_scenario_20_empty_candidates_handling():
    """20. Missing or empty candidates array raises GeminiResponseParsingError."""
    mock_client = MagicMock(spec=httpx.Client)
    req_obj = httpx.Request("POST", "https://dummy.api")
    empty_body = {"candidates": []}
    mock_client.post.return_value = httpx.Response(status_code=200, json=empty_body, request=req_obj)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(consultation_text="Clinical consultation text", language_code="en")

    with pytest.raises(GeminiResponseParsingError) as excinfo:
        adapter.generate_soap_note(req)

    assert "zero candidates" in str(excinfo.value)


def test_scenario_21_missing_response_text():
    """21. Missing parts or text content in candidate raises GeminiResponseParsingError."""
    mock_client = MagicMock(spec=httpx.Client)
    req_obj = httpx.Request("POST", "https://dummy.api")
    no_text_body = {"candidates": [{"content": {"parts": []}}]}
    mock_client.post.return_value = httpx.Response(status_code=200, json=no_text_body, request=req_obj)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(consultation_text="Clinical consultation text", language_code="en")

    with pytest.raises(GeminiResponseParsingError) as excinfo:
        adapter.generate_soap_note(req)

    assert "missing text parts" in str(excinfo.value)


def test_scenario_22_patient_context_enrichment():
    """22. Patient context enrichment attaches demographics, allergies, vitals."""
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = make_gemini_api_response(make_sample_soap_dict())

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(consultation_text="Patient follow up for hypertension.", language_code="en")
    synthetic_context = {
        "demographics": {"calculated_age": 52, "gender": "Male", "preferred_language": "English"},
        "allergies": {
            "allergy_status": "recorded",
            "documented": [{"substance": "Aspirin", "severity": "Moderate"}],
            "patient_reported": [],
            "unverified": [],
        },
        "medical_history_active": ["Essential Hypertension"],
    }

    payload = adapter.generate_soap_note(req, context=synthetic_context)

    assert payload.patient_context is not None
    assert "52y" in (payload.patient_context.demographics_summary or "")
    assert any("Aspirin" in a for a in payload.patient_context.documented_allergies)
    assert any("Hypertension" in c for c in payload.patient_context.chronic_conditions)


def test_scenario_23_qualified_symptom_headache_not_severe():
    """23. F-02: 'Headache, not severe' is qualified positive; remains in reported_symptoms."""
    mock_client = MagicMock(spec=httpx.Client)
    soap_data = make_sample_soap_dict(
        reported_symptoms=["Headache, not severe", "Malaise"],
        pertinent_negatives=["Denies fever"],
    )
    mock_client.post.return_value = make_gemini_api_response(soap_data)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient reports headache, not severe for 2 days. Denies fever.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    # Must remain in reported symptoms because headache is present
    assert "Headache, not severe" in payload.subjective.reported_symptoms
    # Must NOT be moved to pertinent negatives
    assert not any("headache" in n.lower() for n in payload.subjective.pertinent_negatives)
    # Evidence must flag qualification
    assert any("Qualified symptom" in (item.uncertainty_qualifier or "") for item in payload.subjective.evidence)


def test_scenario_24_qualified_symptom_cough_not_worsening():
    """24. F-02: 'Cough, but not worsening' is qualified positive; remains in reported_symptoms."""
    mock_client = MagicMock(spec=httpx.Client)
    soap_data = make_sample_soap_dict(
        reported_symptoms=["Cough, but not worsening"],
        pertinent_negatives=["Denies chest pain"],
    )
    mock_client.post.return_value = make_gemini_api_response(soap_data)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has dry cough, but not worsening. Denies chest pain.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "Cough, but not worsening" in payload.subjective.reported_symptoms
    assert not any("cough" in n.lower() for n in payload.subjective.pertinent_negatives)


def test_scenario_25_qualified_symptom_fever_not_resolving():
    """25. F-02: 'Fever not resolving' indicates persistent fever; remains in reported_symptoms."""
    mock_client = MagicMock(spec=httpx.Client)
    soap_data = make_sample_soap_dict(
        reported_symptoms=["Fever not resolving"],
        pertinent_negatives=["Denies shortness of breath"],
    )
    mock_client.post.return_value = make_gemini_api_response(soap_data)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="High fever not resolving since 3 days. Denies shortness of breath.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "Fever not resolving" in payload.subjective.reported_symptoms
    assert not any("fever" in n.lower() for n in payload.subjective.pertinent_negatives)


def test_scenario_26_qualified_symptom_no_improvement_in_headache():
    """26. F-02: 'No improvement in headache' means headache persists; remains in reported_symptoms."""
    mock_client = MagicMock(spec=httpx.Client)
    soap_data = make_sample_soap_dict(
        reported_symptoms=["No improvement in headache"],
        pertinent_negatives=["Denies vomiting"],
    )
    mock_client.post.return_value = make_gemini_api_response(soap_data)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient reports no improvement in headache. Denies vomiting.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "No improvement in headache" in payload.subjective.reported_symptoms
    assert not any("headache" in n.lower() for n in payload.subjective.pertinent_negatives)


def test_scenario_27_true_negation_vomiting_illa():
    """27. F-02: 'Vomiting illa' is true absence; correctly placed in pertinent_negatives."""
    mock_client = MagicMock(spec=httpx.Client)
    # Model mistakenly placed true negation in reported symptoms
    flawed_soap = make_sample_soap_dict(
        reported_symptoms=["Fever", "Vomiting illa"],
        pertinent_negatives=[],
    )
    mock_client.post.return_value = make_gemini_api_response(flawed_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has fever. Vomiting illa.",
        language_code="kn",
    )
    payload = adapter.generate_soap_note(req)

    # Must be shifted to pertinent negatives
    assert "Fever" in payload.subjective.reported_symptoms
    assert "Vomiting illa" not in payload.subjective.reported_symptoms
    assert any("vomiting" in n.lower() for n in payload.subjective.pertinent_negatives)


def test_scenario_28_true_negation_hindi_jwar_nahi_hai():
    """28. F-02: 'ज्वर नहीं है' is true absence in Hindi; placed in pertinent_negatives."""
    mock_client = MagicMock(spec=httpx.Client)
    flawed_soap = make_sample_soap_dict(
        reported_symptoms=["सिरदर्द", "ज्वर नहीं है"],
        pertinent_negatives=[],
    )
    mock_client.post.return_value = make_gemini_api_response(flawed_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="मरीज़ को सिरदर्द है। ज्वर नहीं है।",
        language_code="hi",
    )
    payload = adapter.generate_soap_note(req)

    assert "सिरदर्द" in payload.subjective.reported_symptoms
    assert "ज्वर नहीं है" not in payload.subjective.reported_symptoms
    assert any("ज्वर" in n for n in payload.subjective.pertinent_negatives)


def test_scenario_29_contradictory_positive_negative_symptoms():
    """29. Contradictory symptoms flagged for clinician review in evidence."""
    mock_client = MagicMock(spec=httpx.Client)
    contradictory_soap = make_sample_soap_dict(
        reported_symptoms=["Chest pain", "Fever"],
        pertinent_negatives=["Denies chest pain"],
    )
    mock_client.post.return_value = make_gemini_api_response(contradictory_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient with fever. Ambiguous reports on chest pain.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    # Denied takes conservative precedence to prevent false positive assertion
    assert "Chest pain" not in payload.subjective.reported_symptoms
    assert "Denies chest pain" in payload.subjective.pertinent_negatives
    # Contradiction MUST be explicitly recorded in evidence
    assert any("Contradictory finding" in (item.uncertainty_qualifier or "") for item in payload.subjective.evidence)


def test_scenario_30_ambiguous_negation_flagged_for_review():
    """30. Ambiguous negation structure preserved in reported and flagged in evidence."""
    mock_client = MagicMock(spec=httpx.Client)
    ambiguous_soap = make_sample_soap_dict(
        reported_symptoms=["Fever, not entirely certain about onset"],
        pertinent_negatives=[],
    )
    mock_client.post.return_value = make_gemini_api_response(ambiguous_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has fever, not entirely certain about onset.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "Fever, not entirely certain about onset" in payload.subjective.reported_symptoms
    assert any("Ambiguous clinical negation" in (item.uncertainty_qualifier or "") for item in payload.subjective.evidence)


def test_scenario_31_disable_retries_single_attempt_f01():
    """31. F-01: max_retries=0 results in exactly one HTTP attempt on 429."""
    mock_client = MagicMock(spec=httpx.Client)
    req_obj = httpx.Request("POST", "https://dummy.api")
    rate_limit_resp = httpx.Response(status_code=429, text="Rate limit exceeded", request=req_obj)
    mock_client.post.return_value = rate_limit_resp

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client, max_retries=0)
    req = SOAPGenerateRequest(consultation_text="Patient reports mild cough.", language_code="en")

    with pytest.raises(GeminiRateLimitError):
        adapter.generate_soap_note(req)

    # Strictly 1 HTTP attempt, zero retries
    assert mock_client.post.call_count == 1


def test_scenario_32_soap_service_gemini_exception_mapping():
    """32. SOAPNoteService maps Gemini exceptions to appropriate HTTP status codes."""
    from fastapi import HTTPException
    from app.services.soap_service import SOAPNoteService
    from app.services.adapters.base import ClinicalNoteAdapter

    class FaultyAdapter(ClinicalNoteAdapter):
        def __init__(self, exc_to_raise):
            self.exc_to_raise = exc_to_raise

        def generate_soap_note(self, request, context=None):
            raise self.exc_to_raise

    db_dummy = MagicMock()
    req = SOAPGenerateRequest(consultation_text="Patient reports mild cough and cold.", language_code="en")

    # 1. Rate Limit -> 429
    service_429 = SOAPNoteService(adapter=FaultyAdapter(GeminiRateLimitError("Rate limit")))
    with pytest.raises(HTTPException) as exc_429:
        service_429.generate_draft(db_dummy, req)
    assert exc_429.value.status_code == 429
    assert "rate limit exceeded" in exc_429.value.detail.lower()

    # 2. Authentication -> 502
    service_auth = SOAPNoteService(adapter=FaultyAdapter(GeminiAuthenticationError("Auth failed")))
    with pytest.raises(HTTPException) as exc_auth:
        service_auth.generate_draft(db_dummy, req)
    assert exc_auth.value.status_code == 502
    assert "authentication failure" in exc_auth.value.detail.lower()

    # 3. Timeout -> 504
    service_timeout = SOAPNoteService(adapter=FaultyAdapter(GeminiTimeoutError("Timed out after 30.0s")))
    with pytest.raises(HTTPException) as exc_timeout:
        service_timeout.generate_draft(db_dummy, req)
    assert exc_timeout.value.status_code == 504
    assert "timed out" in exc_timeout.value.detail.lower()

    # 4. Service Unavailable -> 503
    service_503 = SOAPNoteService(adapter=FaultyAdapter(GeminiServiceUnavailableError("Service unavailable")))
    with pytest.raises(HTTPException) as exc_503:
        service_503.generate_draft(db_dummy, req)
    assert exc_503.value.status_code == 503
    assert "service is temporarily unavailable" in exc_503.value.detail.lower()


def test_scenario_33_model_selection_through_config_and_env():
    """33. Verify model selection through Settings, environment, and adapter instantiation."""
    adapter_default = GeminiSOAPAdapter(api_key=DUMMY_KEY)
    assert adapter_default.model == "gemini-3.5-flash-lite"

    adapter_custom = GeminiSOAPAdapter(api_key=DUMMY_KEY, model="gemini-custom-001")
    assert adapter_custom.model == "gemini-custom-001"

    settings_custom = Settings(
        LLM_PROVIDER="gemini",
        GEMINI_API_KEY=DUMMY_KEY,
        LLM_MODEL="gemini-3.5-flash-lite",
    )
    factory_adapter = get_clinical_note_adapter(settings_custom)
    assert isinstance(factory_adapter, GeminiSOAPAdapter)
    assert factory_adapter.model == "gemini-3.5-flash-lite"


def test_scenario_34_outgoing_url_contains_selected_model():
    """34. Outgoing REST URL dynamically includes the selected model path."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(
        api_key=DUMMY_KEY,
        model="gemini-3.5-flash-lite",
        http_client=mock_client,
    )
    req = SOAPGenerateRequest(consultation_text="Patient has mild headache.", language_code="en")
    adapter.generate_soap_note(req)

    called_url = mock_client.post.call_args[0][0]
    assert "models/gemini-3.5-flash-lite:generateContent" in called_url

    mock_client.reset_mock()
    adapter_v2 = GeminiSOAPAdapter(
        api_key=DUMMY_KEY,
        model="custom-gemini-preview",
        http_client=mock_client,
    )
    adapter_v2.generate_soap_note(req)
    called_url_v2 = mock_client.post.call_args[0][0]
    assert "models/custom-gemini-preview:generateContent" in called_url_v2


def test_scenario_35_http_404_model_not_found_handling_and_sanitization():
    """35. HTTP 404 response raises GeminiModelNotFoundError without leaking credentials."""
    from fastapi import HTTPException
    from app.services.soap_service import SOAPNoteService

    mock_client = MagicMock(spec=httpx.Client)
    req_obj = httpx.Request(
        "POST",
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={DUMMY_KEY}",
    )
    resp_404 = httpx.Response(
        status_code=404,
        json={"error": {"code": 404, "message": "models/gemini-2.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.", "status": "NOT_FOUND"}},
        request=req_obj,
    )
    mock_client.post.return_value = resp_404

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, model="gemini-2.5-flash", http_client=mock_client, max_retries=0)
    req = SOAPGenerateRequest(consultation_text="Patient reports mild cough.", language_code="en")

    with pytest.raises(GeminiModelNotFoundError) as excinfo:
        adapter.generate_soap_note(req)

    err_msg = str(excinfo.value)
    assert "gemini-2.5-flash" in err_msg
    assert "not found" in err_msg.lower() or "unsupported" in err_msg.lower()
    assert DUMMY_KEY not in err_msg

    db_dummy = MagicMock()
    service = SOAPNoteService(adapter=adapter)
    with pytest.raises(HTTPException) as http_exc:
        service.generate_draft(db_dummy, req)
    assert http_exc.value.status_code == 502
    assert "not found or is unavailable" in http_exc.value.detail.lower()
    assert DUMMY_KEY not in str(http_exc.value.detail)


def test_scenario_36_unsupported_investigations_rejected():
    """36. Non-prescribed/hallucinated diagnostic investigations are stripped and recorded."""
    mock_client = MagicMock(spec=httpx.Client)
    hallucinated_soap = make_sample_soap_dict()
    hallucinated_soap["plan"]["diagnostic_workup"] = ["CBC and Dengue NS1", "Urine Routine"]
    mock_client.post.return_value = make_gemini_api_response(hallucinated_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has fever and generalized body ache for 2 days. Denies cough. Vitals normal.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "CBC and Dengue NS1" not in payload.plan.diagnostic_workup
    assert "Urine Routine" not in payload.plan.diagnostic_workup
    assert payload.plan.diagnostic_workup == []
    assert any("Unsupported investigation" in (item.uncertainty_qualifier or "") for item in payload.plan.evidence)

    mock_client.reset_mock()
    mock_client.post.return_value = make_gemini_api_response(hallucinated_soap)
    req_with_orders = SOAPGenerateRequest(
        consultation_text="Patient has fever. Advised CBC and Dengue NS1 test along with Urine Routine.",
        language_code="en",
    )
    payload_grounded = adapter.generate_soap_note(req_with_orders)
    assert "CBC and Dengue NS1" in payload_grounded.plan.diagnostic_workup
    assert "Urine Routine" in payload_grounded.plan.diagnostic_workup


def test_scenario_37_invented_followup_duration_sanitized():
    """37. Invented follow-up timeframes not in transcript are sanitized and flagged."""
    mock_client = MagicMock(spec=httpx.Client)
    hallucinated_soap = make_sample_soap_dict()
    hallucinated_soap["plan"]["follow_up"] = "Review after 48 hours or if fever persists"
    mock_client.post.return_value = make_gemini_api_response(hallucinated_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient reports headache and fever. Advised rest and fluids.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "48 hours" not in payload.plan.follow_up
    assert "[Follow-up schedule not documented]" in payload.plan.follow_up
    assert any("Invented follow-up duration" in (item.uncertainty_qualifier or "") for item in payload.plan.evidence)

    mock_client.reset_mock()
    mock_client.post.return_value = make_gemini_api_response(hallucinated_soap)
    req_grounded = SOAPGenerateRequest(
        consultation_text="Patient reports headache. Follow up in 48 hours if fever persists.",
        language_code="en",
    )
    payload_grounded = adapter.generate_soap_note(req_grounded)
    assert "48 hours" in payload_grounded.plan.follow_up


def test_scenario_38_kannada_english_negation_in_mixed_consultation():
    """38. Mixed English and Kannada negation correctly partitions symptoms into pertinent negatives."""
    mock_client = MagicMock(spec=httpx.Client)
    mixed_soap = make_sample_soap_dict(
        chief_complaint="Fever and malaise since 2 days",
        reported_symptoms=["Fever", "Talenovu (headache)"],
        pertinent_negatives=["Vaanti illa (no vomiting)", "No cough", "Ede novu illa (no chest pain)"],
        primary_impression="Viral illness",
    )
    mock_client.post.return_value = make_gemini_api_response(mixed_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has fever and talenovu since 2 days. Vaanti illa, no cough, ede novu illa.",
        language_code="kn",
    )
    payload = adapter.generate_soap_note(req)

    assert "Fever" in payload.subjective.reported_symptoms
    assert any("vaanti" in n.lower() or "vomiting" in n.lower() for n in payload.subjective.pertinent_negatives)
    assert any("cough" in n.lower() for n in payload.subjective.pertinent_negatives)
    assert any("ede" in n.lower() or "chest" in n.lower() for n in payload.subjective.pertinent_negatives)
    assert not any("cough" in s.lower() for s in payload.subjective.reported_symptoms)
    assert not any("vaanti" in s.lower() or "vomiting" in s.lower() for s in payload.subjective.reported_symptoms)
    assert not any("ede" in s.lower() for s in payload.subjective.reported_symptoms)


def test_scenario_39_request_payload_structure_and_thinking_config():
    """39. Verify official REST payload schema: thinkingConfig nested, thinking_level not directly in generationConfig."""
    adapter_35 = GeminiSOAPAdapter(api_key=DUMMY_KEY, model="gemini-3.5-flash-lite")
    req = SOAPGenerateRequest(
        consultation_text="Patient presents with persistent fever and dry cough for 3 days.",
        language_code="en",
    )
    payload_35 = adapter_35._build_request_payload(req)

    # 1. Structure validation
    assert "generationConfig" in payload_35
    gen_cfg = payload_35["generationConfig"]
    assert gen_cfg.get("responseMimeType") == "application/json"

    # 2. Confirm thinkingConfig is correctly nested and thinking_level is NOT directly in generationConfig
    assert "thinking_level" not in gen_cfg
    assert "thinkingConfig" in gen_cfg
    assert gen_cfg["thinkingConfig"] == {"thinkingLevel": "MINIMAL"}

    # 3. Confirm temperature is omitted for 3.5 / flash-lite models
    assert "temperature" not in gen_cfg

    # 4. Confirm systemInstruction and contents exist
    assert "systemInstruction" in payload_35
    assert "contents" in payload_35

    # 5. Non-3.5 model verification (e.g. gemini-1.5-flash)
    adapter_standard = GeminiSOAPAdapter(api_key=DUMMY_KEY, model="gemini-1.5-flash")
    payload_standard = adapter_standard._build_request_payload(req)
    gen_cfg_std = payload_standard["generationConfig"]
    assert gen_cfg_std.get("responseMimeType") == "application/json"
    assert gen_cfg_std.get("temperature") == 0.1
    assert "thinkingConfig" not in gen_cfg_std


def test_scenario_40_case_1_grounded_event_return_instruction_preserved():
    """Case 1: Transcript says 'Return immediately if vomiting persists' and Gemini reproduces it -> PASS."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    sample_soap["plan"]["follow_up"] = "Return immediately if vomiting persists"
    sample_soap["plan"]["red_flag_warnings"] = ["Return immediately if vomiting persists"]
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient presents with fever and mild headache for 2 days. Return immediately if vomiting persists.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert payload.plan.follow_up == "Return immediately if vomiting persists"
    assert "Return immediately if vomiting persists" in payload.plan.red_flag_warnings

    grounded, msg = is_follow_up_grounded(payload.plan.follow_up, req.consultation_text)
    assert grounded is True


def test_scenario_41_case_2_transcript_no_followup_gemini_invents_scheduled_duration():
    """Case 2: Transcript has no follow-up, Gemini says 'Return in 48 hours.' -> Sanitized / Flagged."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    sample_soap["plan"]["follow_up"] = "Return in 48 hours"
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has fever and cough for 2 days. Advised oral fluids and rest.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "48 hours" not in payload.plan.follow_up
    assert payload.plan.follow_up == "[Follow-up schedule not documented]"
    assert any("Invented follow-up duration" in (item.uncertainty_qualifier or "") for item in payload.plan.evidence)

    raw_grounded, raw_msg = is_follow_up_grounded("Return in 48 hours", req.consultation_text)
    assert raw_grounded is False
    assert "48 hours" in raw_msg


def test_scenario_42_case_3_grounded_scheduled_duration_preserved():
    """Case 3: Transcript says 'Follow up in 3 days' and Gemini reproduces it -> PASS."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    sample_soap["plan"]["follow_up"] = "Follow up in 3 days"
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient presents with acute pharyngitis. Follow up in 3 days if symptoms persist.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "3 days" in payload.plan.follow_up
    assert payload.plan.follow_up == "Follow up in 3 days"

    grounded, msg = is_follow_up_grounded(payload.plan.follow_up, req.consultation_text)
    assert grounded is True


def test_scenario_43_case_4_grounded_event_warning_preserved():
    """Case 4: Transcript says 'Return if rash appears' and Gemini reproduces it -> PASS."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    sample_soap["plan"]["follow_up"] = "Return if rash appears"
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has viral exanthem. Advised hydration. Return if rash appears.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert payload.plan.follow_up == "Return if rash appears"

    grounded, msg = is_follow_up_grounded(payload.plan.follow_up, req.consultation_text)
    assert grounded is True


def test_scenario_44_case_5_transcript_no_return_warning_gemini_invents_chest_pain_warning():
    """Case 5: Transcript has no return warning but Gemini invents 'Return if chest pain occurs.' -> Flagged."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    sample_soap["plan"]["follow_up"] = "Return if chest pain occurs"
    sample_soap["plan"]["red_flag_warnings"] = ["Return if chest pain occurs"]
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient presents with mild fever and sore throat. Advised paracetamol and gargling.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "chest pain" not in payload.plan.follow_up.lower()
    assert payload.plan.follow_up == "[Follow-up schedule not documented]"
    assert not any("chest pain" in w.lower() for w in payload.plan.red_flag_warnings)
    assert any("chest pain occurs" in (item.uncertainty_qualifier or "") for item in payload.plan.evidence)

    raw_grounded, raw_msg = is_follow_up_grounded("Return if chest pain occurs", req.consultation_text)
    assert raw_grounded is False
    assert "chest pain" in raw_msg.lower()


def test_scenario_45_case_6_duration_substitution_flagged():
    """Case 6: Transcript says 'Return immediately if vomiting persists' but Gemini changes to 'Return in 2 days.' -> FAIL."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    sample_soap["plan"]["follow_up"] = "Return in 2 days"
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has fever and headache. Return immediately if vomiting persists.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert "2 days" not in payload.plan.follow_up
    assert payload.plan.follow_up == "[Follow-up schedule not documented]"
    assert any("Invented follow-up duration" in (item.uncertainty_qualifier or "") for item in payload.plan.evidence)

    raw_grounded, raw_msg = is_follow_up_grounded("Return in 2 days", req.consultation_text)
    assert raw_grounded is False
    assert "2 days" in raw_msg


def test_scenario_46_case_7_missing_follow_up_remains_undocumented():
    """Case 7: Transcript has no follow-up at all -> Represented as not documented."""
    mock_client = MagicMock(spec=httpx.Client)
    sample_soap = make_sample_soap_dict()
    sample_soap["plan"]["follow_up"] = "[Follow-up schedule not documented]"
    sample_soap["plan"]["red_flag_warnings"] = []
    mock_client.post.return_value = make_gemini_api_response(sample_soap)

    adapter = GeminiSOAPAdapter(api_key=DUMMY_KEY, http_client=mock_client)
    req = SOAPGenerateRequest(
        consultation_text="Patient has mild cold for 1 day. Advised warm water.",
        language_code="en",
    )
    payload = adapter.generate_soap_note(req)

    assert payload.plan.follow_up in (
        "[Follow-up schedule not documented]",
        None,
        "",
        "[Not documented]",
    )

    grounded, msg = is_follow_up_grounded(payload.plan.follow_up, req.consultation_text)
    assert grounded is True




