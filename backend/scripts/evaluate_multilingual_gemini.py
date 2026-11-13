# -*- coding: utf-8 -*-
"""Arogya Mithra — Phase 5C.7A Multilingual Gemini Clinical Evaluation Harness.

Evaluates clinical SOAP extraction across 30 synthetic multilingual consultations:
- 6 English
- 6 Kannada script
- 6 Hindi script
- 6 Kanglish (Kannada-English code-mixed)
- 6 Hinglish (Hindi-English code-mixed)

SAFETY PRINCIPLES:
1. Strictly OFFLINE by default (uses deterministic mocks, zero network calls).
2. Live calls require two explicit flags: --live AND --confirm-live-eval.
3. No secrets or personal data written to reports or logs.
4. Evaluates concept recall, precision, missing facts, hallucinated facts,
   and critical negation inversions.
5. Does NOT claim automated scoring proves clinical safety or efficacy.
"""

import argparse
import datetime
import json
import logging
import os
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional, Set, Tuple
from unittest.mock import MagicMock
import httpx

# Path setup
script_dir = Path(__file__).resolve().parent
backend_dir = script_dir.parent
project_root = backend_dir.parent

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.schemas.clinical_note import SOAPGenerateRequest, SOAPPayload
from app.services.adapters.gemini_adapter import (
    GeminiAdapterError,
    GeminiAuthenticationError,
    GeminiBadRequestError,
    GeminiConfigurationError,
    GeminiModelNotFoundError,
    GeminiRateLimitError,
    GeminiResponseParsingError,
    GeminiSOAPAdapter,
    GeminiServiceUnavailableError,
    GeminiTimeoutError,
    is_follow_up_grounded,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Classification Categories Hierarchy
# ============================================================================

CAT_FULLY_CORRECT = "FULLY_CORRECT"
CAT_MISSING_SYMPTOMS = "MISSING_SYMPTOMS"
CAT_MISSING_NEGATIVES = "MISSING_NEGATIVES"
CAT_NEGATION_INVERSION = "NEGATION_INVERSION"
CAT_UNSUPPORTED_INFO = "UNSUPPORTED_INFORMATION"
CAT_MANUAL_REVIEW = "MANUAL_REVIEW_REQUIRED"
CAT_PROVIDER_ERROR = "PROVIDER_ERROR"

ALL_CATEGORIES = [
    CAT_FULLY_CORRECT,
    CAT_MISSING_SYMPTOMS,
    CAT_MISSING_NEGATIVES,
    CAT_NEGATION_INVERSION,
    CAT_UNSUPPORTED_INFO,
    CAT_MANUAL_REVIEW,
    CAT_PROVIDER_ERROR,
]


# ============================================================================
# Stopwords and Clinical Synonym Groups
# ============================================================================

STOPWORDS: Set[str] = {
    # English grammatical particles
    "no", "not", "denies", "denied", "without", "none", "and", "or", "in", "of",
    "with", "the", "a", "an", "is", "was", "for", "on", "at", "to", "from", "by",
    "has", "had", "have", "reports", "reported", "patient", "complains", "complaining",
    # Kannada grammatical particles & negations
    "ಮತ್ತು", "ಇಲ್ಲ", "ಇಲ್ಲಾ", "ಇದೆ", "ಆಗಿದೆ", "ಕಂಡುಬಂದಿಲ್ಲ", "ಇರುವುದಿಲ್ಲ", "ಯಾವುದೇ", "ಅಲ್ಲಿ",
    "illa", "illaa", "ide", "aagide", "kandubandilla", "iruvudilla", "yavude", "alli",
    # Hindi grammatical particles & negations
    "और", "नहीं", "है", "था", "थी", "में", "से", "को", "का", "की", "के", "कोई",
    "nahi", "nahin", "hai", "tha", "thi", "mein", "se", "koi", "hua", "hue", "hui",
}

CLINICAL_SYNONYM_GROUPS: List[Set[str]] = [
    {"swelling", "oedema", "edema", "ootha", "oota", "sujan", "soojan", "ಊತ", "ಬಾವು", "ಸೂಜನ", "सूजन"},
    {"sputum", "phlegm", "kafa", "balgam", "cough with phlegm", "ಕಫ", "कफ", "बलगम"},
    {"fever", "pyrexia", "febrile", "high grade fever", "low grade fever", "jwara", "jvara", "bukhar", "bukhaar", "ಜ್ವರ", "ತಾಪ", "बुखार", "ज्वर"},
    {"cough", "khokli", "khasi", "khansi", "kemmu", "ಕೆಮ್ಮು", "खांसी", "खाँसी"},
    {"headache", "head ache", "cephalalgia", "sirdard", "sir dard", "thalenoovu", "thale novu", "talenovu", "ತಲೆನೋವು", "ತಲೆ ನೋವು", "सिरदर्द", "सिर दर्द"},
    {"chest pain", "angina", "edenoovu", "ede novu", "chaati dard", "chaati me dard", "ಎದೆನೋವು", "ಎದೆ ನೋವು", "छाती में दर्द", "छाती दर्द"},
    {"vomiting", "emesis", "vaanti", "vanti", "ulti", "ವಾಂತಿ", "उल्टी"},
    {"nausea", "nauseous", "michalike", "ji machlana", "ji ghabrana", "ಮಿಚಲಿಕೆ", "जी मिचलाना"},
    {"shortness of breath", "dyspnea", "breathless", "breathlessness", "usirata", "saans lene me takleef", "saans foolna", "ಉಸಿರಾಟದ ತೊಂದರೆ", "ಉಸಿರಾಟ", "सांस लेने में तकलीफ", "सांस फूलना"},
    {"loose stools", "diarrhea", "diarrhoea", "bhedi", "dast", "pet kharab", "ಭೇದಿ", "ಹೊಟ್ಟೆ ತೊಳೆಸುವುದು", "दस्त", "पतले दस्त"},
    {"abdominal pain", "stomach pain", "stomachache", "belly pain", "hotte novu", "hottenoovu", "pet dard", "ಹೊಟ್ಟೆ ನೋವು", "ಹೊಟ್ಟೆನೋವು", "पेट दर्द"},
    {"rash", "skin rash", "eruption", "gaddegalu", "daddu", "daane", "khujli", "chakte", "ದದ್ದು", "ಗುಳ್ಳೆ", "चकत्ते", "दाने", "खुजली"},
    {"fatigue", "tiredness", "weakness", "lethargy", "susthi", "nirasu", "kamzori", "thakan", "ಸುಸ್ತು", "ನಿಶ್ಯಕ್ತಿ", "कमजोरी", "थकान"},
    {"joint pain", "sandhi novu", "jod dard", "sandhinoovu", "ಸಂಧಿನೋವು", "ಸಂಧಿ ನೋವು", "जोड़ों में दर्द", "जोड़ दर्द"},
    {"polyuria", "frequent urination", "excessive urination", "baaari baari mootra", "bar bar peshab", "ಹೆಚ್ಚು ಮೂತ್ರ", "बार बार पेशाब"},
]


CLINICAL_QUALIFIERS: Set[str] = {
    "sharp", "severe", "mild", "moderate", "high", "low", "acute", "chronic",
    "heavy", "dull", "continuous", "intermittent", "dry", "runny", "watery",
    "तेज़", "तेज", "हल्का", "हल्की", "तीव्र", "भारी",
    "ತೀವ್ರ", "ಲಘು", "ಒಣ", "ನೀರಿನಂತಹ",
}


# ============================================================================
# Clinical Comparison & Scoring Helpers
# ============================================================================

def _normalize_text(text: str) -> str:
    """Normalize text by lowercasing and stripping punctuation (including Devanagari danda)."""
    if not text:
        return ""
    cleaned = text.lower().replace("।", " ").replace("॥", " ")
    cleaned = re.sub(r"[^\w\s\u0C80-\u0CFF\u0900-\u097F]", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _get_synonym_variants(concept: str) -> List[str]:
    """Retrieve all normalized synonym variants for a given clinical concept."""
    norm = _normalize_text(concept)
    variants = {norm}

    for grp in CLINICAL_SYNONYM_GROUPS:
        norm_grp = {_normalize_text(term) for term in grp}
        # 1. Direct match in group
        if norm in norm_grp:
            variants.update(norm_grp)

        # 2. Qualifier-stripped core concept match (e.g. 'sharp bukhar' -> 'bukhar', 'severe sirdard' -> 'sirdard')
        core_tokens = [w for w in norm.split() if w not in CLINICAL_QUALIFIERS and w not in STOPWORDS]
        core_phrase = " ".join(core_tokens)
        if core_phrase and core_phrase in norm_grp:
            variants.update(norm_grp)
            # Also generate qualified variants across synonyms (e.g. 'severe headache' for 'severe sirdard')
            qualifiers = [w for w in norm.split() if w in CLINICAL_QUALIFIERS]
            for q in qualifiers:
                for term in norm_grp:
                    variants.add(f"{q} {term}")

    return list(variants)


def _concept_present(concept: str, text_list: List[str]) -> bool:
    """Check if a clinical concept or recognized synonym is mentioned in text_list."""
    norm_concept = _normalize_text(concept)
    if not norm_concept:
        return False

    combined_actual = " ".join(_normalize_text(t) for t in text_list)
    if not combined_actual:
        return False

    # Check all synonym variants including the original concept
    all_variants = _get_synonym_variants(norm_concept)

    for variant in all_variants:
        if not variant:
            continue
        # 1. Exact substring match
        if variant in combined_actual:
            return True

        # 2. Token overlap match for multi-word phrases
        variant_tokens = [w for w in variant.split() if w not in STOPWORDS]
        if not variant_tokens:
            variant_tokens = variant.split()

        # If multi-word, require >= 70% of non-stopword tokens to match
        if len(variant_tokens) > 1:
            matched_count = sum(1 for w in variant_tokens if w in combined_actual)
            if (matched_count / len(variant_tokens)) >= 0.7:
                return True

    return False


def classify_provider_error(exc: Exception) -> Dict[str, Any]:
    """Categorize LLM provider errors and sanitize error messages to protect credentials."""
    err_str = str(exc)
    # Mask API key patterns
    sanitized_msg = re.sub(r"(?:key|api_key|AIzaSy)[=:][\w\-]+", "key=********", err_str, flags=re.IGNORECASE)
    sanitized_msg = re.sub(r"AIzaSy[\w\-]{20,}", "AIzaSy********", sanitized_msg)

    if isinstance(exc, GeminiRateLimitError) or "429" in err_str or "rate limit" in err_str.lower():
        error_type = "HTTP_429_RATE_LIMIT"
        status_code = 429
    elif isinstance(exc, GeminiServiceUnavailableError) or "503" in err_str or "service unavailable" in err_str.lower():
        error_type = "HTTP_503_SERVICE_UNAVAILABLE"
        status_code = 503
    elif isinstance(exc, (GeminiTimeoutError, httpx.TimeoutException)) or "timeout" in err_str.lower() or "timed out" in err_str.lower():
        error_type = "TIMEOUT"
        status_code = 504
    elif isinstance(exc, GeminiModelNotFoundError) or "404" in err_str or ("model" in err_str.lower() and "not found" in err_str.lower()):
        error_type = "HTTP_404_MODEL_NOT_FOUND"
        status_code = 404
    elif isinstance(exc, GeminiAuthenticationError) or "401" in err_str or "403" in err_str or "auth" in err_str.lower():
        error_type = "AUTH_FAILURE"
        status_code = 401
    elif isinstance(exc, GeminiBadRequestError) or "400" in err_str or "bad request" in err_str.lower():
        error_type = "HTTP_400_BAD_REQUEST"
        status_code = 400
    elif isinstance(exc, GeminiResponseParsingError):
        error_type = "RESPONSE_PARSING_ERROR"
        status_code = 502
    else:
        error_type = "PROVIDER_UNAVAILABLE"
        status_code = getattr(getattr(exc, "response", None), "status_code", 502)

    return {
        "error_type": error_type,
        "status_code": status_code,
        "message": sanitized_msg,
    }


def evaluate_single_case(case: Dict[str, Any], payload: SOAPPayload) -> Dict[str, Any]:
    """Evaluate a single generated SOAPPayload against ground truth expectations."""
    expected = case.get("expected", {})
    actual_reported = payload.subjective.reported_symptoms or []
    actual_negatives = payload.subjective.pertinent_negatives or []
    actual_meds = payload.plan.proposed_medications or []
    actual_diag_workup = payload.plan.diagnostic_workup or []
    actual_follow_up = payload.plan.follow_up
    actual_warnings = payload.plan.red_flag_warnings or []

    # 1. Reported Symptoms (Positive findings)
    exp_reported = expected.get("reported_symptoms", [])
    sym_tp = [s for s in exp_reported if _concept_present(s, actual_reported)]
    sym_missing = [s for s in exp_reported if s not in sym_tp]

    # 2. Pertinent Negatives (True absences)
    exp_negatives = expected.get("pertinent_negatives", [])
    neg_tp = [n for n in exp_negatives if _concept_present(n, actual_negatives)]
    neg_missing = [n for n in exp_negatives if n not in neg_tp]

    # 3. CRITICAL SAFETY CHECK: Negation Inversion
    negation_inversions = []
    for neg in exp_negatives:
        if _concept_present(neg, actual_reported):
            negation_inversions.append(neg)

    # 4. Diagnostic Uncertainty Preservation
    unc_expected = expected.get("is_diagnostic_uncertainty_expected", False)
    assessment_text = (
        (payload.assessment.primary_impression or "")
        + " "
        + " ".join(payload.assessment.differential_diagnoses or [])
    ).lower()
    uncertainty_cues = [
        "suspected", "rule out", "probable", "likely", "possible", "ಶಂಕಿತ",
        "संभावित", "differential", "unclear", "provisional", "evaluate", "evaluating"
    ]
    uncertainty_preserved = True
    if unc_expected:
        uncertainty_preserved = any(cue in assessment_text for cue in uncertainty_cues)

    # 5. Medication Intent & Safety
    stopped_or_denied = expected.get("stopped_or_denied_medications", [])
    restarted_meds = expected.get("restarted_medications", [])
    med_contraindication_errors = []
    for med in stopped_or_denied:
        if med not in restarted_meds and _concept_present(med, actual_meds):
            med_contraindication_errors.append(med)

    exp_meds = expected.get("proposed_medications", [])
    meds_tp = [m for m in exp_meds if _concept_present(m, actual_meds)]
    meds_missing = [m for m in exp_meds if m not in meds_tp]

    # 6. Objective Findings & Missing Data
    has_missing_obj = expected.get("has_missing_objective_findings", False)
    obj_invention_error = False
    if has_missing_obj:
        vitals = payload.objective.vital_signs_summary or ""
        if re.search(r"\b\d{2,3}[/.]\d{2,3}\b|\b\d{2,3}\s*(?:bpm|mmhg|f)\b", vitals.lower()):
            obj_invention_error = True

    # 7. Hallucinated Diagnostic Workup
    hallucinated_tests = list(actual_diag_workup)

    # 8. Follow-up and Return Warnings Grounding
    fu_grounded, fu_reason = is_follow_up_grounded(actual_follow_up, case["consultation_text"])
    warnings_grounded = all(is_follow_up_grounded(w, case["consultation_text"])[0] for w in actual_warnings)

    # Classification Hierarchy Assignment
    classification_flags = []
    if negation_inversions:
        classification_flags.append(CAT_NEGATION_INVERSION)
    if (
        hallucinated_tests
        or obj_invention_error
        or med_contraindication_errors
        or not fu_grounded
        or not warnings_grounded
    ):
        classification_flags.append(CAT_UNSUPPORTED_INFO)
    if neg_missing:
        classification_flags.append(CAT_MISSING_NEGATIVES)
    if sym_missing:
        classification_flags.append(CAT_MISSING_SYMPTOMS)
    if not uncertainty_preserved:
        classification_flags.append(CAT_MANUAL_REVIEW)

    if not classification_flags:
        primary_classification = CAT_FULLY_CORRECT
        is_clean_pass = True
    else:
        is_clean_pass = False
        # Priority order for primary classification
        if CAT_NEGATION_INVERSION in classification_flags:
            primary_classification = CAT_NEGATION_INVERSION
        elif CAT_UNSUPPORTED_INFO in classification_flags:
            primary_classification = CAT_UNSUPPORTED_INFO
        elif CAT_MISSING_NEGATIVES in classification_flags:
            primary_classification = CAT_MISSING_NEGATIVES
        elif CAT_MISSING_SYMPTOMS in classification_flags:
            primary_classification = CAT_MISSING_SYMPTOMS
        else:
            primary_classification = CAT_MANUAL_REVIEW

    return {
        "case_id": case.get("case_id"),
        "language_group": case.get("language_group"),
        "primary_classification": primary_classification,
        "classification_flags": classification_flags,
        "is_clean_pass": is_clean_pass,
        "symptoms": {
            "expected_count": len(exp_reported),
            "matched_count": len(sym_tp),
            "missing_facts": sym_missing,
            "actual_reported": actual_reported,
        },
        "negatives": {
            "expected_count": len(exp_negatives),
            "matched_count": len(neg_tp),
            "missing_negatives": neg_missing,
            "critical_inversions": negation_inversions,
            "actual_negatives": actual_negatives,
        },
        "diagnostic_uncertainty": {
            "expected": unc_expected,
            "preserved": uncertainty_preserved,
        },
        "medications": {
            "expected_count": len(exp_meds),
            "matched_count": len(meds_tp),
            "missing_medications": meds_missing,
            "contraindication_errors": med_contraindication_errors,
        },
        "objective_safety": {
            "has_missing_findings_expected": has_missing_obj,
            "invention_error": obj_invention_error,
        },
        "plan_safety": {
            "hallucinated_workup": hallucinated_tests,
            "follow_up_grounded": fu_grounded,
            "follow_up_reason": fu_reason,
            "warnings_grounded": warnings_grounded,
        },
    }


# ============================================================================
# Synthetic Mock Response Generator for Offline Execution
# ============================================================================

def make_offline_synthetic_response(case: Dict[str, Any]) -> str:
    """Generate a high-fidelity synthetic mock JSON adhering to case expectations."""
    exp = case.get("expected", {})
    case_id = case.get("case_id", "CASE")

    # Clean positive symptoms
    rep_symptoms = [s.capitalize() for s in exp.get("reported_symptoms", [])]
    # Clean negatives (add denied prefix if not present)
    neg_items = []
    for n in exp.get("pertinent_negatives", []):
        if not n.lower().startswith("denies") and not n.lower().startswith("no"):
            neg_items.append(f"Denies {n}")
        else:
            neg_items.append(n)

    mock_soap = {
        "subjective": {
            "chief_complaint": f"Clinical consultation for case {case_id}",
            "history_of_present_illness": f"Patient presents for clinical evaluation ({case_id}).",
            "reported_symptoms": rep_symptoms,
            "pertinent_negatives": neg_items,
            "evidence": [],
        },
        "objective": {
            "vital_signs_summary": exp.get("expected_vitals_summary"),
            "physical_examination": exp.get("expected_physical_exam", []),
            "investigations_reviewed": [],
            "evidence": [],
        },
        "assessment": {
            "primary_impression": exp.get("primary_impression", "Acute clinical condition"),
            "differential_diagnoses": exp.get("differential_diagnoses", []),
            "chronic_conditions_status": [],
            "evidence": [],
        },
        "plan": {
            "diagnostic_workup": [],
            "proposed_medications": exp.get("proposed_medications", []),
            "patient_instructions": ["Rest, adequate oral hydration as advised."],
            "red_flag_warnings": exp.get("red_flag_warnings", []),
            "follow_up": exp.get("follow_up", "[Follow-up schedule not documented]"),
            "evidence": [],
        },
    }

    response_body = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": json.dumps(mock_soap, ensure_ascii=False)}],
                    "role": "model",
                },
                "finishReason": "STOP",
            }
        ]
    }
    return json.dumps(response_body, ensure_ascii=False)


# ============================================================================
# Main Evaluation Runner
# ============================================================================

def run_evaluation(
    dataset_path: Path,
    output_dir: Path,
    live_mode: bool = False,
    confirm_live_eval: bool = False,
    limit: Optional[int] = None,
    case_ids: Optional[List[str]] = None,
) -> int:
    """Execute the multilingual evaluation pipeline and generate reports."""
    print("=" * 84)
    print("  AROGYA MITHRA — MULTILINGUAL GEMINI CLINICAL EVALUATION HARNESS")
    print("=" * 84)

    # 1. Authorization and Mode Validation
    if live_mode:
        if not confirm_live_eval:
            print("\n[REFUSED] Live evaluation requested without '--confirm-live-eval'.")
            print("To prevent unintended external API requests and quota consumption,")
            print("both flags are required for live execution:")
            print("  python evaluate_multilingual_gemini.py --live --confirm-live-eval")
            return 2

        from dotenv import load_dotenv
        load_dotenv(project_root / ".env")
        load_dotenv(backend_dir / ".env")

        api_key = (
            os.environ.get("GEMINI_API_KEY")
            or os.environ.get("LLM_API_KEY")
            or (settings.get_gemini_api_key() if hasattr(settings, "get_gemini_api_key") else None)
        )
        if not api_key:
            print("\n[ERROR] GEMINI_API_KEY not found in environment or .env. Cannot run live evaluation.")
            return 1
        print(f"\n[MODE] LIVE EVALUATION (Model: {settings.LLM_MODEL}, max_retries: 0)")
    else:
        print("\n[MODE] OFFLINE EVALUATION (Mocked client, strictly 0 network requests)")

    # 2. Load Dataset
    if not dataset_path.exists():
        print(f"\n[ERROR] Dataset file not found at: {dataset_path}")
        return 1

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    all_cases = data.get("cases", [])
    total_dataset_cases = len(all_cases)

    # Filter by explicit case IDs if provided
    if case_ids:
        # Check for duplicates in case_ids
        seen = set()
        duplicates = []
        for cid in case_ids:
            if cid in seen and cid not in duplicates:
                duplicates.append(cid)
            seen.add(cid)
        if duplicates:
            print(f"\n[ERROR] Duplicate case IDs provided in --case-ids: {duplicates}")
            return 1

        all_dataset_ids = {c["case_id"] for c in all_cases}
        unknown_ids = [cid for cid in case_ids if cid not in all_dataset_ids]
        if unknown_ids:
            print(f"\n[ERROR] Unknown case IDs provided: {unknown_ids}")
            print(f"Available case IDs ({len(all_dataset_ids)} total): {sorted(list(all_dataset_ids))}")
            return 1

        selected_cases = [c for cid in case_ids for c in all_cases if c["case_id"] == cid]
        all_cases = selected_cases
        print(f"[DATASET] Selected {len(all_cases)} of {total_dataset_cases} cases: {case_ids}")
    elif limit and limit > 0:
        all_cases = all_cases[:limit]
        print(f"[DATASET] Loaded pilot subset of {len(all_cases)} cases (limit={limit})")
    else:
        print(f"[DATASET] Loaded {len(all_cases)} evaluation cases across 5 language groups.")

    print(f"[TARGET EXECUTION COUNT] {len(all_cases)} case(s) queued for evaluation.\n")

    # 3. Execution Pipeline
    results: List[Dict[str, Any]] = []

    for i, case in enumerate(all_cases, start=1):
        grp = case["language_group"]
        cid = case["case_id"]
        print(f"  [{i:02d}/{len(all_cases):02d}] Evaluating {cid} ({grp})...", end="", flush=True)

        req = SOAPGenerateRequest(
            consultation_text=case["consultation_text"],
            language_code=case["language_code"],
        )

        try:
            if live_mode:
                adapter = GeminiSOAPAdapter(api_key=api_key, model=settings.LLM_MODEL, max_retries=0)
            else:
                mock_client = MagicMock(spec=httpx.Client)
                mock_resp_text = make_offline_synthetic_response(case)
                mock_resp = httpx.Response(
                    status_code=200,
                    text=mock_resp_text,
                    request=httpx.Request("POST", "https://mock.genai.test"),
                )
                mock_client.post.return_value = mock_resp
                adapter = GeminiSOAPAdapter(
                    api_key="AIzaSyMockKeyForOfflineEvaluationOnly",
                    model=settings.LLM_MODEL,
                    http_client=mock_client,
                )

            payload = adapter.generate_soap_note(req)
            case_eval = evaluate_single_case(case, payload)
            results.append(case_eval)
            print(f" [{case_eval['primary_classification']}]")

        except Exception as exc:
            provider_err = classify_provider_error(exc)
            print(f" [{CAT_PROVIDER_ERROR}: {provider_err['error_type']}]")
            results.append({
                "case_id": cid,
                "language_group": grp,
                "primary_classification": CAT_PROVIDER_ERROR,
                "classification_flags": [CAT_PROVIDER_ERROR],
                "is_clean_pass": False,
                "is_provider_error": True,
                "provider_error": provider_err,
                "error": provider_err["message"],
            })

    # 4. Aggregation by Language Group across Provider and Clinical Categories
    group_stats: Dict[str, Dict[str, Any]] = {}
    provider_failures: List[Dict[str, Any]] = []

    for res in results:
        grp = res.get("language_group", "Unknown")
        if grp not in group_stats:
            group_stats[grp] = {
                "requested_cases": 0,
                "completed_cases": 0,
                "provider_errors": 0,
                "error_breakdown": {},
                "fully_correct": 0,
                "missing_symptoms": 0,
                "missing_negatives": 0,
                "negation_inversion": 0,
                "unsupported_info": 0,
                "manual_review": 0,
                "total_expected_symptoms": 0,
                "matched_symptoms": 0,
                "total_expected_negatives": 0,
                "matched_negatives": 0,
                "critical_negation_inversions": 0,
            }

        s = group_stats[grp]
        s["requested_cases"] += 1
        cat = res.get("primary_classification")

        if cat == CAT_PROVIDER_ERROR or res.get("is_provider_error"):
            s["provider_errors"] += 1
            err_info = res.get("provider_error", {})
            err_type = err_info.get("error_type", "UNKNOWN_PROVIDER_ERROR")
            s["error_breakdown"][err_type] = s["error_breakdown"].get(err_type, 0) + 1
            provider_failures.append({
                "case_id": res.get("case_id"),
                "language_group": grp,
                "error_type": err_type,
                "status_code": err_info.get("status_code"),
                "message": res.get("error"),
            })
            # Provider failures are availability issues, NOT completed clinical notes.
            # Exclude from clinical recall denominators.
            continue

        # Completed clinical evaluation
        s["completed_cases"] += 1
        if cat == CAT_FULLY_CORRECT:
            s["fully_correct"] += 1
        elif cat == CAT_MISSING_SYMPTOMS:
            s["missing_symptoms"] += 1
        elif cat == CAT_MISSING_NEGATIVES:
            s["missing_negatives"] += 1
        elif cat == CAT_NEGATION_INVERSION:
            s["negation_inversion"] += 1
        elif cat == CAT_UNSUPPORTED_INFO:
            s["unsupported_info"] += 1
        else:
            s["manual_review"] += 1

        if "symptoms" in res:
            s["total_expected_symptoms"] += res["symptoms"]["expected_count"]
            s["matched_symptoms"] += res["symptoms"]["matched_count"]
        if "negatives" in res:
            s["total_expected_negatives"] += res["negatives"]["expected_count"]
            s["matched_negatives"] += res["negatives"]["matched_count"]
            s["critical_negation_inversions"] += len(res["negatives"]["critical_inversions"])

    # 5. Output Summary Report Table
    print("\n" + "=" * 94)
    print("  MULTILINGUAL CLINICAL EVALUATION SUMMARY (API AVAILABILITY & CLINICAL FIDELITY)")
    print("=" * 94)
    print(
        f"{'Language Group':<12} | {'Req':<4} | {'Done':<4} | {'API Err':<7} | "
        f"{'Fully Cor':<9} | {'Miss Sym':<8} | {'Miss Neg':<8} | {'Neg Inv':<7} | {'Unsup':<5} | {'Rev':<4}"
    )
    print("-" * 94)

    total_requested_cases = len(all_cases)
    total_completed_cases = sum(s["completed_cases"] for s in group_stats.values())
    total_provider_errors = sum(s["provider_errors"] for s in group_stats.values())
    total_fully_correct = sum(s["fully_correct"] for s in group_stats.values())
    total_inversions = sum(s["critical_negation_inversions"] for s in group_stats.values())

    for grp, s in sorted(group_stats.items()):
        print(
            f"{grp:<12} | {s['requested_cases']:<4} | {s['completed_cases']:<4} | {s['provider_errors']:<7} | "
            f"{s['fully_correct']:<9} | {s['missing_symptoms']:<8} | {s['missing_negatives']:<8} | "
            f"{s['negation_inversion']:<7} | {s['unsupported_info']:<5} | {s['manual_review']:<4}"
        )

    print("-" * 94)
    print(
        f"{'Totals':<12} | {total_requested_cases:<4} | {total_completed_cases:<4} | {total_provider_errors:<7} | "
        f"{total_fully_correct:<9} | "
        f"{sum(s['missing_symptoms'] for s in group_stats.values()):<8} | "
        f"{sum(s['missing_negatives'] for s in group_stats.values()):<8} | "
        f"{total_inversions:<7} | "
        f"{sum(s['unsupported_info'] for s in group_stats.values()):<5} | "
        f"{sum(s['manual_review'] for s in group_stats.values()):<4}"
    )
    print("=" * 94)

    api_success_rate = (total_completed_cases / total_requested_cases * 100) if total_requested_cases > 0 else 0.0
    clinical_fully_correct_rate = (total_fully_correct / total_completed_cases * 100) if total_completed_cases > 0 else 0.0
    end_to_end_rate = (total_fully_correct / total_requested_cases * 100) if total_requested_cases > 0 else 0.0

    print("\n[API AVAILABILITY METRICS]")
    print(f"  Total Requested Cases:   {total_requested_cases}")
    print(f"  Total Completed Calls:   {total_completed_cases}")
    print(f"  Total Provider Errors:   {total_provider_errors}")
    print(f"  API Call Success Rate:   {api_success_rate:.1f}%")
    if provider_failures:
        print("  Provider Error Breakdown:")
        err_counts: Dict[str, int] = {}
        for pf in provider_failures:
            err_counts[pf["error_type"]] = err_counts.get(pf["error_type"], 0) + 1
        for etype, cnt in sorted(err_counts.items()):
            print(f"    - {etype}: {cnt} case(s)")

    print("\n[CLINICAL QUALITY METRICS (Evaluated on Completed Calls)]")
    if total_completed_cases > 0:
        print(f"  Clinical Fully Correct:  {total_fully_correct}/{total_completed_cases} ({clinical_fully_correct_rate:.1f}%)")
    else:
        print("  Clinical Fully Correct:  0/0 (N/A — all requests failed at provider level)")
    print(f"  End-to-End Success Rate: {total_fully_correct}/{total_requested_cases} ({end_to_end_rate:.1f}%)")
    print(f"  Critical Negation Errors: {total_inversions}")

    print("\n[CLINICAL RECALL BY LANGUAGE GROUP (Completed Evaluations)]")
    for grp, s in sorted(group_stats.items()):
        sym_rec = (
            f"{(s['matched_symptoms'] / s['total_expected_symptoms'] * 100):.1f}%"
            if s["total_expected_symptoms"] > 0
            else "N/A"
        )
        neg_rec = (
            f"{(s['matched_negatives'] / s['total_expected_negatives'] * 100):.1f}%"
            if s["total_expected_negatives"] > 0
            else "N/A"
        )
        print(f"  {grp:<12}: Symptom Recall = {sym_rec:<7} | Negation Recall = {neg_rec:<7} ({s['completed_cases']}/{s['requested_cases']} completed)")

    # 6. Save Artifact Report
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = output_dir / f"multilingual_eval_{timestamp}.json"

    report_payload = {
        "timestamp": timestamp,
        "mode": "live" if live_mode else "offline_mock",
        "model": settings.LLM_MODEL,
        "evaluation_counts": {
            "requested_cases": total_requested_cases,
            "completed_cases": total_completed_cases,
            "provider_error_cases": total_provider_errors,
        },
        "api_metrics": {
            "api_success_rate_pct": round(api_success_rate, 2),
            "provider_error_count": total_provider_errors,
            "provider_failures": provider_failures,
        },
        "clinical_metrics": {
            "clinical_fully_correct_rate_pct": round(clinical_fully_correct_rate, 2),
            "overall_clean_pass_rate_pct": round(clinical_fully_correct_rate, 2),
            "overall_fully_correct_rate_pct": round(clinical_fully_correct_rate, 2),
            "end_to_end_pass_rate_pct": round(end_to_end_rate, 2),
            "total_critical_negation_inversions": total_inversions,
        },
        # Backwards-compatible top-level keys
        "total_cases_evaluated": total_completed_cases,
        "total_cases_requested": total_requested_cases,
        "overall_clean_pass_rate_pct": round(clinical_fully_correct_rate, 2),
        "overall_fully_correct_rate_pct": round(clinical_fully_correct_rate, 2),
        "total_critical_negation_inversions": total_inversions,
        "language_group_breakdown": group_stats,
        "case_evaluations": results,
        "disclaimer": (
            "NOTICE: Automated grading evaluates transcript grounding and safety heuristic adherence. "
            "It does NOT replace human clinical judgment, diagnostic validation, or clinical trial approval."
        ),
    }

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, ensure_ascii=False, indent=2)

    print(f"\n[REPORT] Detailed JSON evaluation report saved to:")
    print(f"         {report_file}")
    print("=" * 84)

    return 0


def main():
    parser = argparse.ArgumentParser(description="Arogya Mithra Multilingual Clinical Evaluation")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Request live evaluation via Google Gemini API",
    )
    parser.add_argument(
        "--confirm-live-eval",
        action="store_true",
        help="Explicit confirmation required to allow live Gemini API requests",
    )
    parser.add_argument(
        "--case-ids",
        type=str,
        default=None,
        help="Comma-separated case IDs to evaluate (e.g. KN_01,KANGLISH_01)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit evaluation to first N cases (pilot testing)",
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=backend_dir / "data" / "multilingual_eval_dataset.json",
        help="Path to evaluation dataset JSON file",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=backend_dir / "reports",
        help="Directory to save evaluation reports",
    )

    args = parser.parse_args()

    parsed_case_ids = None
    if args.case_ids:
        parsed_case_ids = [c.strip() for c in args.case_ids.split(",") if c.strip()]

    return run_evaluation(
        dataset_path=args.dataset,
        output_dir=args.output_dir,
        live_mode=args.live,
        confirm_live_eval=args.confirm_live_eval,
        limit=args.limit,
        case_ids=parsed_case_ids,
    )


if __name__ == "__main__":
    sys.exit(main())
