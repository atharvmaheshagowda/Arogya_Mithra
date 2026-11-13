"""Automated tests for Arogya Mithra Phase 5C.7 Multilingual Evaluation Harness.

Verifies:
1. Evaluation dataset distribution (30 cases, 6 per language group).
2. Offline mode makes strictly zero external network requests.
3. Live mode is refused without explicit '--confirm-live-eval' authorization.
4. Critical negation inversions are detected and flagged.
5. Contraindicated/stopped medications erroneously prescribed are flagged.
6. Hallucinated investigations and invented findings are flagged.
7. Failed Gemini responses do not produce fabricated successful results.
8. Score calculation and language-group metric aggregation are accurate.
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from app.schemas.clinical_note import SOAPPayload
from app.services.adapters.gemini_adapter import (
    GeminiRateLimitError,
    GeminiServiceUnavailableError,
    GeminiTimeoutError,
)
from scripts.evaluate_multilingual_gemini import (
    CAT_FULLY_CORRECT,
    CAT_MANUAL_REVIEW,
    CAT_MISSING_NEGATIVES,
    CAT_MISSING_SYMPTOMS,
    CAT_NEGATION_INVERSION,
    CAT_PROVIDER_ERROR,
    CAT_UNSUPPORTED_INFO,
    _concept_present,
    _normalize_text,
    classify_provider_error,
    evaluate_single_case,
    make_offline_synthetic_response,
    run_evaluation,
)

DATASET_PATH = Path(__file__).resolve().parent.parent / "data" / "multilingual_eval_dataset.json"


@pytest.fixture
def eval_dataset():
    assert DATASET_PATH.exists(), f"Evaluation dataset not found at {DATASET_PATH}"
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================================
# 1. Dataset Distribution & Counts
# ============================================================================

def test_eval_dataset_distribution_and_language_counts(eval_dataset):
    """Verify exactly 30 cases across 5 language groups (6 cases each)."""
    assert eval_dataset["total_cases"] == 30
    cases = eval_dataset["cases"]
    assert len(cases) == 30

    groups = {}
    for c in cases:
        grp = c["language_group"]
        groups[grp] = groups.get(grp, 0) + 1

        # Check required fields
        assert "case_id" in c
        assert "language_code" in c
        assert "consultation_text" in c
        assert "expected" in c

        exp = c["expected"]
        assert "reported_symptoms" in exp
        assert "pertinent_negatives" in exp
        assert "primary_impression" in exp
        assert "proposed_medications" in exp

    assert groups == {
        "English": 6,
        "Kannada": 6,
        "Hindi": 6,
        "Kanglish": 6,
        "Hinglish": 6,
    }


# ============================================================================
# 2. Offline Mode Zero-Network-Call Guarantee
# ============================================================================

def test_offline_mode_makes_zero_network_requests(tmp_path):
    """Verify offline mode executes completely without any outbound HTTP network calls."""
    with patch("httpx.Client.post") as mock_http_post:
        exit_code = run_evaluation(
            dataset_path=DATASET_PATH,
            output_dir=tmp_path,
            live_mode=False,
            limit=5,
        )
        assert exit_code == 0
        # Zero real HTTP calls executed
        mock_http_post.assert_not_called()


# ============================================================================
# 3. Live Mode Authorization Refusal
# ============================================================================

def test_live_mode_refused_without_explicit_authorization(tmp_path):
    """Verify --live without --confirm-live-eval is immediately rejected with exit code 2."""
    with patch("httpx.Client.post") as mock_http_post:
        exit_code = run_evaluation(
            dataset_path=DATASET_PATH,
            output_dir=tmp_path,
            live_mode=True,
            confirm_live_eval=False,
            limit=5,
        )
        assert exit_code == 2
        mock_http_post.assert_not_called()


# ============================================================================
# 4. Critical Negation Inversion Detection
# ============================================================================

def test_critical_negation_inversion_detection():
    """Verify that a denied symptom appearing in reported_symptoms is flagged as critical error."""
    mock_case = {
        "case_id": "TEST_NEG_INV",
        "language_group": "English",
        "consultation_text": "Patient has fever. Denies chest pain. Lungs clear.",
        "expected": {
            "reported_symptoms": ["fever"],
            "pertinent_negatives": ["chest pain"],
            "is_diagnostic_uncertainty_expected": False,
            "proposed_medications": [],
            "stopped_or_denied_medications": [],
            "has_missing_objective_findings": False,
        },
    }

    # Inverted model output: erroneously puts 'chest pain' into reported_symptoms!
    inverted_payload = SOAPPayload.model_validate({
        "subjective": {
            "chief_complaint": "Fever and chest pain",
            "history_of_present_illness": "Patient reports fever and chest pain.",
            "reported_symptoms": ["Fever", "Chest pain"],
            "pertinent_negatives": [],
            "evidence": [],
        },
        "objective": {"physical_examination": [], "evidence": []},
        "assessment": {"primary_impression": "Viral illness", "evidence": []},
        "plan": {
            "diagnostic_workup": [],
            "proposed_medications": [],
            "patient_instructions": [],
            "red_flag_warnings": [],
            "follow_up": "[Follow-up schedule not documented]",
            "evidence": [],
        },
    })

    result = evaluate_single_case(mock_case, inverted_payload)
    assert result["is_clean_pass"] is False
    assert "chest pain" in result["negatives"]["critical_inversions"]
    assert len(result["negatives"]["critical_inversions"]) == 1


# ============================================================================
# 5. Contraindicated / Stopped Medication Prescribing Error
# ============================================================================

def test_contraindication_medication_error_detection():
    """Verify that a stopped/denied medication erroneously prescribed is flagged."""
    mock_case = {
        "case_id": "TEST_MED_ERROR",
        "language_group": "English",
        "consultation_text": "Patient stopped taking Amoxicillin due to rash. Advised rest.",
        "expected": {
            "reported_symptoms": ["rash"],
            "pertinent_negatives": [],
            "is_diagnostic_uncertainty_expected": False,
            "proposed_medications": [],
            "stopped_or_denied_medications": ["Amoxicillin"],
            "has_missing_objective_findings": False,
        },
    }

    # Model incorrectly prescribes the stopped medication Amoxicillin
    erroneous_payload = SOAPPayload.model_validate({
        "subjective": {
            "chief_complaint": "Rash",
            "history_of_present_illness": "Patient has rash.",
            "reported_symptoms": ["Rash"],
            "pertinent_negatives": [],
            "evidence": [],
        },
        "objective": {"physical_examination": [], "evidence": []},
        "assessment": {"primary_impression": "Drug rash", "evidence": []},
        "plan": {
            "diagnostic_workup": [],
            "proposed_medications": ["Amoxicillin 500mg TDS"],
            "patient_instructions": [],
            "red_flag_warnings": [],
            "follow_up": "[Follow-up schedule not documented]",
            "evidence": [],
        },
    })

    result = evaluate_single_case(mock_case, erroneous_payload)
    assert result["is_clean_pass"] is False
    assert "Amoxicillin" in result["medications"]["contraindication_errors"]


# ============================================================================
# 6. Hallucinated Investigations & Objective Inventions
# ============================================================================

def test_hallucinated_investigations_and_invented_findings_flagged():
    """Verify ungrounded diagnostic workup and invented vitals are flagged."""
    mock_case = {
        "case_id": "TEST_HALLUCINATION",
        "language_group": "English",
        "consultation_text": "Telephonic call: Patient has headache for 1 day. No vitals measured.",
        "expected": {
            "reported_symptoms": ["headache"],
            "pertinent_negatives": [],
            "is_diagnostic_uncertainty_expected": False,
            "proposed_medications": [],
            "stopped_or_denied_medications": [],
            "has_missing_objective_findings": True,
        },
    }

    # Model hallucinates CBC and invents BP 120/80 mmHg on a telephonic call
    hallucinating_payload = SOAPPayload.model_validate({
        "subjective": {
            "chief_complaint": "Headache",
            "history_of_present_illness": "Headache for 1 day.",
            "reported_symptoms": ["Headache"],
            "pertinent_negatives": [],
            "evidence": [],
        },
        "objective": {
            "vital_signs_summary": "BP 120/80 mmHg, temp 98.6 F",
            "physical_examination": [],
            "evidence": [],
        },
        "assessment": {"primary_impression": "Headache", "evidence": []},
        "plan": {
            "diagnostic_workup": ["Complete Blood Count (CBC)"],
            "proposed_medications": [],
            "patient_instructions": [],
            "red_flag_warnings": [],
            "follow_up": "[Follow-up schedule not documented]",
            "evidence": [],
        },
    })

    result = evaluate_single_case(mock_case, hallucinating_payload)
    assert result["is_clean_pass"] is False
    assert result["objective_safety"]["invention_error"] is True
    assert "Complete Blood Count (CBC)" in result["plan_safety"]["hallucinated_workup"]


# ============================================================================
# 7. Failed Gemini Response Handling (No Fabricated Success)
# ============================================================================

def test_failed_gemini_response_does_not_fabricate_success(tmp_path):
    """Verify that an exception or API failure is recorded as an error and not a fabricated pass."""
    with patch("app.services.adapters.gemini_adapter.GeminiSOAPAdapter.generate_soap_note") as mock_gen:
        mock_gen.side_effect = RuntimeError("Simulated Gemini API Failure")

        exit_code = run_evaluation(
            dataset_path=DATASET_PATH,
            output_dir=tmp_path,
            live_mode=False,
            limit=2,
        )
        assert exit_code == 0

        # Read output report
        report_files = list(tmp_path.glob("multilingual_eval_*.json"))
        assert len(report_files) == 1
        with open(report_files[0], "r", encoding="utf-8") as f:
            rep = json.load(f)

        assert rep["overall_clean_pass_rate_pct"] == 0.0
        for ce in rep["case_evaluations"]:
            assert ce["is_clean_pass"] is False
            assert ce["primary_classification"] == CAT_PROVIDER_ERROR
            assert "Simulated Gemini API Failure" in ce["error"]


# ============================================================================
# 8. Score Calculation & Matching Precision
# ============================================================================

def test_score_calculation_accuracy():
    """Verify concept normalization and score calculation accuracy."""
    assert _normalize_text("Fever, high-grade!") == "fever high grade"
    assert _normalize_text("ಜ್ವರ ಮತ್ತು ತಲೆನೋವು.") == "ಜ್ವರ ಮತ್ತು ತಲೆನೋವು"
    assert _normalize_text("सिरदर्द नहीं है।") == "सिरदर्द नहीं है"

    # Concept presence
    assert _concept_present("dry cough", ["Patient has a severe dry cough"]) is True
    assert _concept_present("vomiting", ["Patient denies vomiting and nausea"]) is True
    assert _concept_present("fever", ["Patient has normal temperature and mild headache"]) is False


# ============================================================================
# 9. Indic Short Root Words Preservation (ಊತ, कफ)
# ============================================================================

def test_indic_short_root_words_preservation():
    """Verify 2-character Indic clinical root words are preserved and matched."""
    # Kannada: ಊತ (swelling, len == 2)
    assert _concept_present("ಊತ", ["ಕಾಲಿನಲ್ಲಿ ಊತ ಕಂಡುಬಂದಿಲ್ಲ"]) is True
    assert _concept_present("ಊತ", ["ಕಾಲಿನಲ್ಲಿ ಬಾವು ಮತ್ತು ಊತ ಇದೆ"]) is True
    assert _concept_present("ಊತ", ["ಜ್ವರ ಮತ್ತು ಕೆಮ್ಮು ಇದೆ"]) is False

    # Hindi: कफ (sputum/phlegm, len == 2)
    assert _concept_present("कफ", ["खांसी के साथ कफ नहीं आ रहा"]) is True
    assert _concept_present("कफ", ["सूखी खांसी है"]) is False


# ============================================================================
# 10. Missing Negatives Disqualifies Clean Pass
# ============================================================================

def test_missing_negatives_disqualifies_clean_pass():
    """Verify that missing an expected pertinent negative prevents FULLY_CORRECT."""
    mock_case = {
        "case_id": "TEST_MISSING_NEG",
        "language_group": "English",
        "consultation_text": "Patient has cough. Denies fever. Denies chest pain.",
        "expected": {
            "reported_symptoms": ["cough"],
            "pertinent_negatives": ["fever", "chest pain"],
            "is_diagnostic_uncertainty_expected": False,
            "proposed_medications": [],
            "stopped_or_denied_medications": [],
            "has_missing_objective_findings": False,
        },
    }

    # Payload only includes "fever" in pertinent_negatives, omits "chest pain"
    payload = SOAPPayload.model_validate({
        "subjective": {
            "chief_complaint": "Cough",
            "history_of_present_illness": "Patient has cough.",
            "reported_symptoms": ["Cough"],
            "pertinent_negatives": ["Denies fever"],
            "evidence": [],
        },
        "objective": {"physical_examination": [], "evidence": []},
        "assessment": {"primary_impression": "Bronchitis", "evidence": []},
        "plan": {
            "diagnostic_workup": [],
            "proposed_medications": [],
            "patient_instructions": [],
            "red_flag_warnings": [],
            "follow_up": "[Follow-up schedule not documented]",
            "evidence": [],
        },
    })

    result = evaluate_single_case(mock_case, payload)
    assert result["is_clean_pass"] is False
    assert result["primary_classification"] == CAT_MISSING_NEGATIVES
    assert "chest pain" in result["negatives"]["missing_negatives"]
    assert CAT_MISSING_NEGATIVES in result["classification_flags"]


# ============================================================================
# 11. Case Selection and CLI Argument Validation
# ============================================================================

def test_case_ids_selection_and_validation(tmp_path):
    """Verify --case-ids selection, duplicate rejection, and unknown ID rejection."""
    # 1. Valid subset selection (KN_01 and KANGLISH_01)
    exit_code = run_evaluation(
        dataset_path=DATASET_PATH,
        output_dir=tmp_path,
        live_mode=False,
        case_ids=["KN_01", "KANGLISH_01"],
    )
    assert exit_code == 0
    report_files = sorted(tmp_path.glob("multilingual_eval_*.json"))
    assert len(report_files) >= 1
    with open(report_files[-1], "r", encoding="utf-8") as f:
        rep = json.load(f)
    assert rep["total_cases_evaluated"] == 2
    executed_ids = [ce["case_id"] for ce in rep["case_evaluations"]]
    assert executed_ids == ["KN_01", "KANGLISH_01"]

    # 2. Duplicate ID rejection
    exit_dup = run_evaluation(
        dataset_path=DATASET_PATH,
        output_dir=tmp_path,
        live_mode=False,
        case_ids=["KN_01", "KN_01"],
    )
    assert exit_dup == 1

    # 3. Unknown ID rejection
    exit_unknown = run_evaluation(
        dataset_path=DATASET_PATH,
        output_dir=tmp_path,
        live_mode=False,
        case_ids=["NON_EXISTENT_ID_99"],
    )
    assert exit_unknown == 1


# ============================================================================
# 12. Six-Tier Classification Hierarchy
# ============================================================================

def test_six_tier_classification_hierarchy():
    """Verify that the six-category hierarchy assigns appropriate primary classification."""
    base_case = {
        "case_id": "TEST_HIERARCHY",
        "language_group": "English",
        "consultation_text": "Patient has fever. Denies nausea.",
        "expected": {
            "reported_symptoms": ["fever"],
            "pertinent_negatives": ["nausea"],
            "is_diagnostic_uncertainty_expected": False,
            "proposed_medications": [],
            "stopped_or_denied_medications": [],
            "has_missing_objective_findings": False,
        },
    }

    # Clean case -> FULLY_CORRECT
    clean_payload = SOAPPayload.model_validate({
        "subjective": {
            "chief_complaint": "Fever",
            "history_of_present_illness": "Fever for 1 day.",
            "reported_symptoms": ["Fever"],
            "pertinent_negatives": ["Denies nausea"],
            "evidence": [],
        },
        "objective": {"physical_examination": [], "evidence": []},
        "assessment": {"primary_impression": "Viral fever", "evidence": []},
        "plan": {
            "diagnostic_workup": [],
            "proposed_medications": [],
            "patient_instructions": [],
            "red_flag_warnings": [],
            "follow_up": "[Follow-up schedule not documented]",
            "evidence": [],
        },
    })
    res_clean = evaluate_single_case(base_case, clean_payload)
    assert res_clean["primary_classification"] == CAT_FULLY_CORRECT
    assert res_clean["is_clean_pass"] is True

    # Missing symptom -> MISSING_SYMPTOMS
    sym_missing_payload = clean_payload.model_copy(deep=True)
    sym_missing_payload.subjective.reported_symptoms = []
    res_sym_missing = evaluate_single_case(base_case, sym_missing_payload)
    assert res_sym_missing["primary_classification"] == CAT_MISSING_SYMPTOMS
    assert res_sym_missing["is_clean_pass"] is False


# ============================================================================
# 13. Phase 5C.7C Provider-Error Reporting Regression Tests
# ============================================================================

def test_provider_error_classification_http_429(tmp_path):
    """Verify HTTP 429 rate limit is classified as PROVIDER_ERROR with status 429."""
    with patch("app.services.adapters.gemini_adapter.GeminiSOAPAdapter.generate_soap_note") as mock_gen:
        mock_gen.side_effect = GeminiRateLimitError("Gemini API rate limit exceeded (HTTP 429) after 0 retries.")

        exit_code = run_evaluation(
            dataset_path=DATASET_PATH,
            output_dir=tmp_path,
            live_mode=False,
            case_ids=["KN_01"],
        )
        assert exit_code == 0

        report_files = sorted(tmp_path.glob("multilingual_eval_*.json"))
        with open(report_files[-1], "r", encoding="utf-8") as f:
            rep = json.load(f)

        assert rep["evaluation_counts"]["requested_cases"] == 1
        assert rep["evaluation_counts"]["completed_cases"] == 0
        assert rep["evaluation_counts"]["provider_error_cases"] == 1
        assert rep["api_metrics"]["api_success_rate_pct"] == 0.0

        ce = rep["case_evaluations"][0]
        assert ce["primary_classification"] == CAT_PROVIDER_ERROR
        assert ce["is_provider_error"] is True
        assert ce["provider_error"]["error_type"] == "HTTP_429_RATE_LIMIT"
        assert ce["provider_error"]["status_code"] == 429

        # Ensure Kannada stats exclude failed case from recall denominators
        kn_stats = rep["language_group_breakdown"]["Kannada"]
        assert kn_stats["requested_cases"] == 1
        assert kn_stats["completed_cases"] == 0
        assert kn_stats["provider_errors"] == 1
        assert kn_stats["manual_review"] == 0  # NOT classified under manual review
        assert kn_stats["total_expected_symptoms"] == 0  # Excluded from denominator


def test_provider_error_classification_http_503(tmp_path):
    """Verify HTTP 503 service unavailable is classified as PROVIDER_ERROR with status 503."""
    with patch("app.services.adapters.gemini_adapter.GeminiSOAPAdapter.generate_soap_note") as mock_gen:
        mock_gen.side_effect = GeminiServiceUnavailableError(
            "Gemini API is temporarily unavailable (HTTP 503 Service Unavailable) after 0 retries."
        )

        exit_code = run_evaluation(
            dataset_path=DATASET_PATH,
            output_dir=tmp_path,
            live_mode=False,
            case_ids=["KANGLISH_01"],
        )
        assert exit_code == 0

        report_files = sorted(tmp_path.glob("multilingual_eval_*.json"))
        with open(report_files[-1], "r", encoding="utf-8") as f:
            rep = json.load(f)

        assert rep["evaluation_counts"]["provider_error_cases"] == 1
        ce = rep["case_evaluations"][0]
        assert ce["primary_classification"] == CAT_PROVIDER_ERROR
        assert ce["provider_error"]["error_type"] == "HTTP_503_SERVICE_UNAVAILABLE"
        assert ce["provider_error"]["status_code"] == 503


def test_provider_error_classification_timeout(tmp_path):
    """Verify gateway/network timeout is classified as PROVIDER_ERROR with status 504."""
    with patch("app.services.adapters.gemini_adapter.GeminiSOAPAdapter.generate_soap_note") as mock_gen:
        mock_gen.side_effect = GeminiTimeoutError("Gemini API request timed out after 30.0s threshold.")

        exit_code = run_evaluation(
            dataset_path=DATASET_PATH,
            output_dir=tmp_path,
            live_mode=False,
            case_ids=["EN_01"],
        )
        assert exit_code == 0

        report_files = sorted(tmp_path.glob("multilingual_eval_*.json"))
        with open(report_files[-1], "r", encoding="utf-8") as f:
            rep = json.load(f)

        assert rep["evaluation_counts"]["provider_error_cases"] == 1
        ce = rep["case_evaluations"][0]
        assert ce["primary_classification"] == CAT_PROVIDER_ERROR
        assert ce["provider_error"]["error_type"] == "TIMEOUT"
        assert ce["provider_error"]["status_code"] == 504


def test_mixed_run_reporting_separates_api_and_clinical_metrics(tmp_path):
    """Simulate pilot condition: KN_01 succeeds, KANGLISH_01 fails with HTTP 503.

    Verifies:
    1. Provider error is NOT grouped under manual review or clinical errors.
    2. API success rate reflects the outage (50%).
    3. Clinical fully correct rate evaluates completed cases only (100%).
    4. Recall denominators are NOT diluted by the failed call.
    """
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        kn_case = [c for c in json.load(f)["cases"] if c["case_id"] == "KN_01"][0]
    kn_raw = json.loads(make_offline_synthetic_response(kn_case))
    kn_soap = SOAPPayload.model_validate(json.loads(kn_raw["candidates"][0]["content"]["parts"][0]["text"]))

    call_count = 0

    def mock_generate(req, context=None):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # Succeeds for KN_01 with fully correct payload
            return kn_soap
        else:
            # Fails for KANGLISH_01 with HTTP 503
            raise GeminiServiceUnavailableError("Gemini API HTTP 503 Service Unavailable")

    with patch("app.services.adapters.gemini_adapter.GeminiSOAPAdapter.generate_soap_note", side_effect=mock_generate):
        exit_code = run_evaluation(
            dataset_path=DATASET_PATH,
            output_dir=tmp_path,
            live_mode=False,
            case_ids=["KN_01", "KANGLISH_01"],
        )
        assert exit_code == 0

        report_files = sorted(tmp_path.glob("multilingual_eval_*.json"))
        with open(report_files[-1], "r", encoding="utf-8") as f:
            rep = json.load(f)

        # 1. Counts check
        counts = rep["evaluation_counts"]
        assert counts["requested_cases"] == 2
        assert counts["completed_cases"] == 1
        assert counts["provider_error_cases"] == 1

        # 2. API Metrics check
        api_metrics = rep["api_metrics"]
        assert api_metrics["api_success_rate_pct"] == 50.0
        assert api_metrics["provider_error_count"] == 1

        # 3. Clinical Metrics check (calculated on completed cases only)
        clin_metrics = rep["clinical_metrics"]
        assert clin_metrics["clinical_fully_correct_rate_pct"] == 100.0
        assert clin_metrics["end_to_end_pass_rate_pct"] == 50.0
        assert clin_metrics["total_critical_negation_inversions"] == 0

        # 4. Breakdown check: Kanglish has 0 completed, 1 provider error, 0 manual review
        kanglish_stats = rep["language_group_breakdown"]["Kanglish"]
        assert kanglish_stats["requested_cases"] == 1
        assert kanglish_stats["completed_cases"] == 0
        assert kanglish_stats["provider_errors"] == 1
        assert kanglish_stats["manual_review"] == 0
        assert kanglish_stats["total_expected_symptoms"] == 0


def test_credential_masking_in_provider_error_reporting(tmp_path):
    """Verify that credentials in exception messages are scrubbed from outputs and reports."""
    secret_key = "AIzaSySecretApiKey1234567890abcdef"
    with patch("app.services.adapters.gemini_adapter.GeminiSOAPAdapter.generate_soap_note") as mock_gen:
        mock_gen.side_effect = RuntimeError(
            f"Failed calling https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={secret_key}"
        )

        exit_code = run_evaluation(
            dataset_path=DATASET_PATH,
            output_dir=tmp_path,
            live_mode=False,
            case_ids=["EN_01"],
        )
        assert exit_code == 0

        report_files = sorted(tmp_path.glob("multilingual_eval_*.json"))
        with open(report_files[-1], "r", encoding="utf-8") as f:
            report_raw_text = f.read()

        # Strict safety check: secret key must never appear in report text
        assert secret_key not in report_raw_text
        assert "key=********" in report_raw_text or "AIzaSy********" in report_raw_text


# ============================================================================
# 14. Phase 5C.7D Hinglish Symptom Recall Regression Tests
# ============================================================================

def test_hinglish_01_symptom_recall_with_english_and_hindi_synonyms(eval_dataset):
    """Verify HINGLISH_01 symptoms ('sharp bukhar', 'severe sirdard') match English & Hindi extractions."""
    case = [c for c in eval_dataset["cases"] if c["case_id"] == "HINGLISH_01"][0]

    # 1. Clinical English extraction: ["Fever", "Severe headache"]
    english_payload = SOAPPayload.model_validate({
        "subjective": {
            "chief_complaint": "Sharp fever and severe headache for 3 days",
            "history_of_present_illness": "Patient presents with sharp fever and severe headache for 3 days.",
            "reported_symptoms": ["Fever", "Severe headache"],
            "pertinent_negatives": [
                "Denies vision blur",
                "Denies vomiting",
                "Denies loose motions",
                "Denies chest pain",
                "Denies abdominal pain",
            ],
            "evidence": [],
        },
        "objective": {
            "vital_signs_summary": "temp 101.0 F, pulse 90, BP 118/78",
            "physical_examination": ["chest clear", "throat mildly congested"],
            "investigations_reviewed": [],
            "evidence": [],
        },
        "assessment": {
            "primary_impression": "Suspected acute viral pyrexia",
            "differential_diagnoses": ["rule out dengue"],
            "chronic_conditions_status": [],
            "evidence": [],
        },
        "plan": {
            "diagnostic_workup": [],
            "proposed_medications": ["Tab Paracetamol 650mg TDS"],
            "patient_instructions": ["Push fluids"],
            "red_flag_warnings": ["hospital aana immediately agar severe pet dard ya vomiting start ho"],
            "follow_up": "Review after 3 days",
            "evidence": [],
        },
    })

    eval_eng = evaluate_single_case(case, english_payload)
    assert eval_eng["primary_classification"] == CAT_FULLY_CORRECT
    assert eval_eng["is_clean_pass"] is True
    assert eval_eng["symptoms"]["matched_count"] == 2
    assert eval_eng["symptoms"]["missing_facts"] == []

    # 2. Transliterated Hindi extraction: ["Bukhar", "Sirdard"]
    hindi_payload = english_payload.model_copy(deep=True)
    hindi_payload.subjective.reported_symptoms = ["Bukhar", "Sirdard"]
    eval_hi = evaluate_single_case(case, hindi_payload)
    assert eval_hi["primary_classification"] == CAT_FULLY_CORRECT
    assert eval_hi["is_clean_pass"] is True
    assert eval_hi["symptoms"]["matched_count"] == 2
    assert eval_hi["symptoms"]["missing_facts"] == []

    # 3. Devanagari Hindi extraction: ["बुखार", "सिरदर्द"]
    devanagari_payload = english_payload.model_copy(deep=True)
    devanagari_payload.subjective.reported_symptoms = ["बुखार", "सिरदर्द"]
    eval_dev = evaluate_single_case(case, devanagari_payload)
    assert eval_dev["primary_classification"] == CAT_FULLY_CORRECT
    assert eval_dev["is_clean_pass"] is True
    assert eval_dev["symptoms"]["matched_count"] == 2
    assert eval_dev["symptoms"]["missing_facts"] == []


def test_qualifier_preservation_does_not_cause_negation_inversion():
    """Verify that qualifier handling does not cause distinct clinical concepts to falsely match."""
    # "sitting alli breathlessness" must NOT match exertional breathlessness
    assert _concept_present(
        "sitting alli breathlessness",
        ["dry kemmu", "breathlessness on climbing stairs"],
    ) is False

    # "focal weakness" must NOT match generalized weakness
    assert _concept_present(
        "focal weakness",
        ["tale tiruguvike dizziness", "generalized weakness"],
    ) is False




