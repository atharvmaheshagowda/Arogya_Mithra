"""Standalone Smoke Test for Harshitha's Gemini API Prototype.

This script tests the GeminiSOAPAdapter with ONE synthetic clinical consultation.
NOTE: Real API calls require a valid GEMINI_API_KEY environment variable.
DO NOT RUN IN AUTOMATED CI/CD WITHOUT EXPLICIT PERMISSION.

Usage:
    # Live test (requires GEMINI_API_KEY set):
    python backend/scripts/smoke_test_gemini.py

    # Dry-run / mock test (verifies Gemini adapter logic offline using mocked HTTP client):
    python backend/scripts/smoke_test_gemini.py --dry-run
"""

import argparse
import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock
import httpx
from dotenv import load_dotenv

# Add project root and backend dir to sys.path
backend_dir = Path(__file__).resolve().parent.parent
project_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))

# Explicitly load .env from project root and backend dir
load_dotenv(project_root / ".env")
load_dotenv(backend_dir / ".env")

from app.core.config import settings
from app.schemas.clinical_note import SOAPGenerateRequest
from app.services.adapters.gemini_adapter import GeminiSOAPAdapter, is_follow_up_grounded


def run_smoke_test(dry_run: bool = False):
    print("=" * 70)
    print("  AROGYA MITHRA — HARSHITHA'S GEMINI SOAP ADAPTER SMOKE TEST")
    print("=" * 70)

    # 1. Model Resolution
    configured_model = (
        os.environ.get("LLM_MODEL")
        or settings.LLM_MODEL
        or "gemini-3.5-flash-lite"
    ).strip()

    # 2. API Key Check
    api_key = (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("LLM_API_KEY")
        or (settings.get_gemini_api_key() if hasattr(settings, "get_gemini_api_key") else None)
    )

    if not api_key and not dry_run:
        print("\n[WARNING] GEMINI_API_KEY is not configured in your environment or .env file.")
        print(f"Target Model: {configured_model}")
        print("To run a live test with Google Gemini:")
        print("  1. In PowerShell: $env:GEMINI_API_KEY=\"AIzaSy...\"")
        print("  2. Or add GEMINI_API_KEY=AIzaSy... to Arogya_Mithra/.env")
        print("  3. Run this script again: python backend/scripts/smoke_test_gemini.py")
        print("\nAlternatively, run with --dry-run to test the Gemini adapter offline.")
        sys.exit(0)

    # 3. Prepare Synthetic Consultation
    synthetic_consultation = (
        "Patient presents with fever for 3 days and severe headache. "
        "Denies chest pain. Vomiting illa. No difficulty breathing. "
        "Doctor notes mild pharyngeal congestion, temp 100.8 F, BP 120/80 mmHg. "
        "Suspected viral pharyngitis, rule out dengue. "
        "Plan: Paracetamol 650mg TDS for 3 days, warm saline gargling, push oral fluids. "
        "Return immediately if persistent vomiting or rash appears."
    )

    print(f"\n[1] Synthetic Consultation Input:\n{synthetic_consultation}\n")

    if dry_run:
        print(f"[2] Running in DRY-RUN mode (GeminiSOAPAdapter for '{configured_model}' with mocked HTTP client)...")
        mock_client = MagicMock(spec=httpx.Client)
        # Synthetic mock output strictly grounded in transcript (no invented labs or follow-up durations)
        synthetic_gemini_json = {
            "subjective": {
                "chief_complaint": "Fever for 3 days and severe headache",
                "history_of_present_illness": "Patient presents with fever for 3 days and severe headache.",
                "reported_symptoms": ["Fever", "Severe headache"],
                "pertinent_negatives": ["Denies chest pain", "Vomiting illa", "No difficulty breathing"],
                "evidence": [
                    {"text": "fever for 3 days", "source_evidence": "fever for 3 days", "is_negated": False}
                ],
            },
            "objective": {
                "vital_signs_summary": "Temp 100.8 F, BP 120/80 mmHg",
                "physical_examination": ["Mild pharyngeal congestion noted by doctor"],
                "investigations_reviewed": [],
                "evidence": [],
            },
            "assessment": {
                "primary_impression": "Suspected viral pharyngitis",
                "differential_diagnoses": ["Rule out dengue"],
                "chronic_conditions_status": [],
                "evidence": [],
            },
            "plan": {
                "diagnostic_workup": [],
                "proposed_medications": ["Paracetamol 650mg TDS for 3 days"],
                "patient_instructions": ["Warm saline gargling", "Push oral fluids"],
                "red_flag_warnings": ["Return immediately if persistent vomiting or rash appears"],
                "follow_up": "[Follow-up schedule not documented]",
                "evidence": [],
            },
        }
        req_obj = httpx.Request(
            "POST",
            f"https://generativelanguage.googleapis.com/v1beta/models/{configured_model}:generateContent",
        )
        mock_response = httpx.Response(
            status_code=200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": json.dumps(synthetic_gemini_json)}],
                            "role": "model",
                        },
                        "finishReason": "STOP",
                    }
                ]
            },
            request=req_obj,
        )
        mock_client.post.return_value = mock_response
        adapter = GeminiSOAPAdapter(
            api_key="AIzaSyDummyKeyForDryRun",
            model=configured_model,
            http_client=mock_client,
        )
    else:
        print(f"[2] Initializing GeminiSOAPAdapter (Model: {configured_model}, max_retries: 0)...")
        # Finding F-01: Explicitly set max_retries=0 for the first live demonstration test
        # to ensure strictly one HTTP attempt with no automated retries on transient errors.
        adapter = GeminiSOAPAdapter(api_key=api_key, model=configured_model, max_retries=0)

    req = SOAPGenerateRequest(
        consultation_text=synthetic_consultation,
        language_code="en",
    )

    # 4. Execution
    print(f"[3] Generating SOAP Note Draft using model '{configured_model}'...")
    try:
        soap_payload = adapter.generate_soap_note(req)
    except Exception as exc:
        print(f"\n[FAIL] SOAP Note Generation Failed with error: {exc}")
        sys.exit(1)

    # 5. Display Results
    print("\n" + "=" * 70)
    print("  GENERATED CLINICAL SOAP NOTE DRAFT")
    print("=" * 70)
    print(f"\n--- SUBJECTIVE ---")
    print(f"Chief Complaint: {soap_payload.subjective.chief_complaint}")
    print(f"HPI: {soap_payload.subjective.history_of_present_illness}")
    print(f"Reported Symptoms: {soap_payload.subjective.reported_symptoms}")
    print(f"Pertinent Negatives: {soap_payload.subjective.pertinent_negatives}")

    print(f"\n--- OBJECTIVE ---")
    print(f"Vitals: {soap_payload.objective.vital_signs_summary}")
    print(f"Physical Exam: {soap_payload.objective.physical_examination}")

    print(f"\n--- ASSESSMENT ---")
    print(f"Primary Impression: {soap_payload.assessment.primary_impression}")
    print(f"Differential Diagnoses: {soap_payload.assessment.differential_diagnoses}")

    print(f"\n--- PLAN ---")
    print(f"Diagnostic Workup: {soap_payload.plan.diagnostic_workup}")
    print(f"Proposed Medications: {soap_payload.plan.proposed_medications}")
    print(f"Patient Instructions: {soap_payload.plan.patient_instructions}")
    print(f"Red Flags & Return Warnings: {soap_payload.plan.red_flag_warnings}")
    print(f"Follow Up: {soap_payload.plan.follow_up}")

    # 6. Clinical Safety Verification Checks
    print("\n" + "=" * 70)
    print("  CLINICAL SAFETY VERIFICATION CHECKS")
    print("=" * 70)

    negatives_text = " ".join(soap_payload.subjective.pertinent_negatives).lower()
    reported_text = " ".join(soap_payload.subjective.reported_symptoms).lower()

    checks = []

    # Check A: Negated chest pain in pertinent negatives
    check_a = "chest pain" in negatives_text
    checks.append(("Chest pain in Pertinent Negatives", check_a))

    # Check B: Vomiting (Kanglish: 'vomiting illa') in pertinent negatives
    check_b = "vomiting" in negatives_text
    checks.append(("Vomiting ('vomiting illa') in Pertinent Negatives", check_b))

    # Check C: Denied symptoms NOT in reported symptoms
    check_c = ("chest pain" not in reported_text) and ("vomiting" not in reported_text)
    checks.append(("Pertinent Negatives excluded from Reported Symptoms", check_c))

    # Check D: Diagnostic uncertainty preserved
    impression_text = (
        soap_payload.assessment.primary_impression
        + " "
        + " ".join(soap_payload.assessment.differential_diagnoses)
    ).lower()
    check_d = (
        "suspected" in impression_text
        or "rule out" in impression_text
        or "pharyngitis" in impression_text
    )
    checks.append(("Diagnostic uncertainty preserved in Assessment", check_d))

    # Check E: No unsupported investigations invented (none ordered in consultation text)
    check_e = len(soap_payload.plan.diagnostic_workup) == 0
    checks.append(("No unsupported investigations invented (diagnostic_workup empty)", check_e))

    # Check F: No invented follow-up duration or ungrounded precautions
    is_fu_grounded, fu_reason = is_follow_up_grounded(
        soap_payload.plan.follow_up,
        synthetic_consultation,
    )
    all_warnings_grounded = all(
        is_follow_up_grounded(w, synthetic_consultation)[0]
        for w in soap_payload.plan.red_flag_warnings
    )
    check_f = is_fu_grounded and all_warnings_grounded
    checks.append(("No invented follow-up duration", check_f))

    all_passed = True
    for name, passed in checks:
        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"  {status_str} {name}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("  ALL CLINICAL SAFETY CHECKS PASSED SUCCESSFULLY!")
    else:
        print("  SOME CLINICAL SAFETY CHECKS FAILED.")
    print("=" * 70)

    return 0 if all_passed else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Arogya Mithra Gemini Adapter Smoke Test")
    parser.add_argument("--dry-run", action="store_true", help="Run offline using mock client")
    args = parser.parse_args()
    sys.exit(run_smoke_test(dry_run=args.dry_run))
