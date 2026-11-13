"""Gemini API Clinical SOAP Note Adapter for Arogya Mithra.

Harshitha's external LLM prototype integration.
Communicates with Google GenAI REST API endpoints using standard httpx client.
Adheres strictly to ClinicalNoteAdapter interface and SOAPPayload Pydantic schema.

Key safety properties:
1. Strict schema compliance with SOAPPayload.
2. Zero hallucination: Missing details remain explicitly unavailable.
3. Multilingual negation preservation: English, Kannada, Kanglish, Hindi, Hinglish.
4. Deterministic post-processing safety sanitizer.
5. Secure API key handling (masked in logs/repr, never leaked).
6. Resilient transient retry with exponential backoff; immediate fail on auth/client errors.
"""

import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import Settings, settings as default_settings
from app.schemas.clinical_note import (
    AssessmentSection,
    ExtractedItem,
    ObjectiveSection,
    PlanSection,
    SOAPGenerateRequest,
    SOAPPayload,
    SubjectiveSection,
)
from app.services.adapters.base import ClinicalNoteAdapter
from app.services.adapters.mock_adapter import DeterministicMockSOAPAdapter

logger = logging.getLogger(__name__)


# ============================================================================
# Custom Exceptions
# ============================================================================


class LLMAdapterNotImplementedError(NotImplementedError):
    """Raised when an external LLM provider is configured but its adapter is not yet implemented."""
    pass


class GeminiAdapterError(Exception):
    """Base exception for Gemini adapter errors."""
    pass


class GeminiConfigurationError(GeminiAdapterError, LLMAdapterNotImplementedError, ValueError):
    """Raised when Gemini configuration (e.g. API key) is invalid or missing."""
    pass


class GeminiAuthenticationError(GeminiAdapterError, ValueError):
    """Raised when Gemini API returns 401 Unauthorized or 403 Forbidden."""
    pass


class GeminiRateLimitError(GeminiAdapterError, ValueError):
    """Raised when Gemini API rate limit (429) is exceeded after maximum retries."""
    pass


class GeminiServiceUnavailableError(GeminiAdapterError, ValueError):
    """Raised when Gemini API returns 503 Service Unavailable after maximum retries."""
    pass


class GeminiTimeoutError(GeminiAdapterError, ValueError):
    """Raised when Gemini API request times out."""
    pass


class GeminiBadRequestError(GeminiAdapterError, ValueError):
    """Raised when Gemini API returns 400 Bad Request."""
    pass


class GeminiResponseParsingError(GeminiAdapterError, ValueError):
    """Raised when Gemini API returns unparseable or invalid JSON."""
    pass


class GeminiModelNotFoundError(GeminiAdapterError, ValueError):
    """Raised when the specified model ID is not found (HTTP 404) or unavailable."""
    pass


# ============================================================================
# Multilingual Negation Patterns
# ============================================================================

# Qualified positive symptoms where 'not' / 'no' modifies severity, progression, or treatment response
# In all these cases, the symptom is PRESENT; only severity/progression/response is qualified.
_QUALIFIED_POSITIVE_RE = re.compile(
    r"\b("
    # Progression / Lack of resolution (symptom is PRESENT / PERSISTENT)
    r"not\s+(?:resolving|resolved|improving|improved|subsided|subsiding|easing|decreasing|clearing|settling|better|gone)"
    r"|no\s+(?:improvement|relief|reduction|decrease|change|resolution)\s+(?:in|from|with)"
    r"|no\s+better"
    r"|not\s+responding"
    r"|kammi\s+aag(?:th)?illa"
    r"|kam\s+nahi\s+ho\s+raha"
    r"|aaram\s+nahi\s+hai"
    r"|theek\s+nahi\s+hua"
    # Severity / Character / Radiation (symptom is PRESENT)
    r"|not\s+(?:severe|mild|moderate|worsening|worse|constant|radiating|bearable|unbearable|daily)"
    r"|not\s+(?:at\s+rest|with\s+exertion|associated\s+with)"
    r")\b",
    re.IGNORECASE,
)

# Unambiguous leading absence indicators (English)
_TRUE_ABSENCE_LEADING_RE = re.compile(
    r"^(?:no|denies|denied|without|negative\s+for|free\s+of|rules?\s+out)\s+"
    r"(?!improvement\b|relief\b|change\b|reduction\b|better\b|response\b)(.+)$",
    re.IGNORECASE,
)

# Unambiguous trailing absence indicators (Kannada, Kanglish, Hindi, Hinglish)
_TRUE_ABSENCE_TRAILING_RE = re.compile(
    r"^(.+?)\s+(?:"
    r"illa|aagthilla|aagutilla|aaguthilla|aagalla|bedvu|"
    r"ಇಲ್ಲ|ಆಗುತ್ತಿಲ್ಲ|ಇಲ್ಲವೇ\s*ಇಲ್ಲ|ಕಂಡುಬಂದಿಲ್ಲ|ಇಲ್ಲವಂತೆ|ಇಲ್ಲವೆಂದು|"
    r"nahi\s+hai|nahin\s+hai|nahi\s+ho\s+raha|nahi|nahin|"
    r"नहीं\s*है|नहीं\s*हो\s*रहा|नहीं|कोई\s*नहीं"
    r")$",
    re.IGNORECASE,
)

# English negation cues
_EN_NEGATION_RE = re.compile(
    r"\b(no|denies|denied|without|negative for|free of|not having|did not have|not)\b",
    re.IGNORECASE,
)

# Kannada script negation cues
# ಇಲ್ಲ (illa - no/not), ಆಗುತ್ತಿಲ್ಲ (aaguthilla - not happening), ಇಲ್ಲವೇ ಇಲ್ಲ (illave illa - not at all), ಕಂಡುಬಂದಿಲ್ಲ (kandubandilla - not found)
_KN_NEGATION_RE = re.compile(
    r"(ಇಲ್ಲ|ಆಗುತ್ತಿಲ್ಲ|ಇಲ್ಲವೇ\s*ಇಲ್ಲ|ಕಂಡುಬಂದಿಲ್ಲ|ಇಲ್ಲವಂತೆ|ಇಲ್ಲವೆಂದು)",
    re.IGNORECASE,
)

# Kanglish (Latin-script transliterated Kannada) negation cues
# illa, aagthilla, aagutilla, aagalla, illave illa, yellu illa, bedvu
_KANGLISH_NEGATION_RE = re.compile(
    r"\b(illa|aagthilla|aagutilla|aaguthilla|aagalla|illave\s+illa|yellu\s+illa|bedvu)\b",
    re.IGNORECASE,
)

# Hindi Devanagari script negation cues
# नहीं (nahi - no), नहीं है (nahi hai), नहीं हो रहा (nahi ho raha), कोई नहीं (koi nahi)
_HI_NEGATION_RE = re.compile(
    r"(नहीं|नहीं\s*है|नहीं\s*हो\s*रहा|कोई\s*नहीं|इनकार\s*किया)",
    re.IGNORECASE,
)

# Hinglish (Latin-script transliterated Hindi) negation cues
# nahi, nahi hai, nahin, nahi ho raha, koi nahi, mana kiya
_HINGLISH_NEGATION_RE = re.compile(
    r"\b(nahi|nahin|nahi\s+hai|nahin\s+hai|nahi\s+ho\s+raha|koi\s+nahi|mana\s+kiya)\b",
    re.IGNORECASE,
)

# Combined negation detector for post-processing safety checks
_ANY_NEGATION_RE = re.compile(
    r"\b(no|denies|denied|without|negative for|not|illa|aagthilla|aagutilla|bedvu|nahi|nahin)\b|"
    r"(ಇಲ್ಲ|ಆಗುತ್ತಿಲ್ಲ|ಇಲ್ಲವೇ\s*ಇಲ್ಲ|ಕಂಡುಬಂದಿಲ್ಲ|नहीं|नहीं\s*है)",
    re.IGNORECASE,
)


def _mask_api_key(key: Optional[str]) -> str:
    """Mask API key for safe representation in logs, repr, and error messages."""
    if not key:
        return "[NOT SET]"
    if len(key) <= 8:
        return "********"
    return f"{key[:6]}...{key[-4:]}"


# ============================================================================
# Gemini SOAP Adapter Implementation
# ============================================================================


class GeminiSOAPAdapter(ClinicalNoteAdapter):
    """Clinical SOAP Note generator powered by Google Gemini API.

    Designed for outpatient consultation drafting with strict clinical safety:
    - Never hallucinates symptoms, vital signs, investigations, or diagnoses.
    - Preserves negation across English, Kannada, Kanglish, Hindi, and Hinglish.
    - Distinguishes patient statements from clinical observations.
    - Explicitly surfaces diagnostic uncertainty.
    - Outputs strictly validated SOAPPayload Pydantic structures.
    """

    DEFAULT_MODEL = "gemini-3.5-flash-lite"
    DEFAULT_TIMEOUT_SECONDS = 30.0
    BASE_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        settings: Optional[Settings] = None,
        http_client: Optional[httpx.Client] = None,
        backoff_factor: float = 0.5,
        max_retries: int = 3,
    ):
        """Initialize the Gemini SOAP Adapter.

        Resolves configuration from explicit parameters, Settings, or environment variables.
        Fails fast if no valid API key is available.
        """
        active_settings = settings or default_settings

        # Resolve API Key
        resolved_key = api_key
        if not resolved_key and hasattr(active_settings, "get_gemini_api_key"):
            resolved_key = active_settings.get_gemini_api_key()
        if not resolved_key and getattr(active_settings, "GEMINI_API_KEY", None):
            resolved_key = active_settings.GEMINI_API_KEY.get_secret_value()
        if not resolved_key and getattr(active_settings, "LLM_API_KEY", None):
            resolved_key = active_settings.LLM_API_KEY.get_secret_value()
        if not resolved_key:
            resolved_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")

        if not resolved_key or not resolved_key.strip():
            raise GeminiConfigurationError(
                "GEMINI_API_KEY is not configured. Set the GEMINI_API_KEY environment variable "
                "(or LLM_API_KEY) or switch to LLM_PROVIDER='mock' for offline development. "
                "Real LLM adapter for provider 'gemini' is not yet implemented without an API key."
            )

        self._api_key = resolved_key.strip()

        # Resolve Model
        resolved_model = (
            model
            or active_settings.LLM_MODEL
            or os.environ.get("LLM_MODEL")
            or self.DEFAULT_MODEL
        )
        self.model = resolved_model.strip()

        # Resolve Timeout
        resolved_timeout = (
            timeout
            if timeout is not None
            else getattr(active_settings, "LLM_TIMEOUT_SECONDS", self.DEFAULT_TIMEOUT_SECONDS)
        )
        self.timeout = float(resolved_timeout)

        # HTTP Client & Retries
        self._http_client = http_client
        self.backoff_factor = backoff_factor
        self.max_retries = max_retries

    def __repr__(self) -> str:
        return (
            f"GeminiSOAPAdapter("
            f"model='{self.model}', "
            f"api_key='{_mask_api_key(self._api_key)}', "
            f"timeout={self.timeout}s)"
        )

    # ------------------------------------------------------------------------
    # Clinical Note Adapter Protocol
    # ------------------------------------------------------------------------

    def generate_soap_note(
        self,
        request: SOAPGenerateRequest,
        context: Optional[Dict[str, Any]] = None,
    ) -> SOAPPayload:
        """Generate a structured clinical SOAP note draft via Gemini REST API."""
        consultation_text = request.consultation_text.strip()
        if not consultation_text:
            raise ValueError("Consultation text cannot be empty.")

        # Build prompt & request payload
        payload = self._build_request_payload(request, context)

        # Execute HTTP call with retry handling
        raw_json_str = self._execute_gemini_request(payload)

        # Parse & validate into SOAPPayload
        soap_payload = self._parse_and_validate_response(raw_json_str)

        # Apply deterministic safety sanitization
        safe_payload = self._sanitize_and_verify_safety(soap_payload, request, context)

        return safe_payload

    # ------------------------------------------------------------------------
    # Prompt Construction
    # ------------------------------------------------------------------------

    def _build_system_instruction(self) -> str:
        return (
            "You are an expert outpatient clinical documentation assistant for Arogya Mithra, "
            "an outpatient clinical decision-support and workflow system in India.\n\n"
            "YOUR OBJECTIVE:\n"
            "Generate an outpatient Clinical SOAP Note draft strictly adhering to the specified JSON schema.\n\n"
            "MANDATORY CLINICAL SAFETY RULES:\n"
            "1. ZERO HALLUCINATION:\n"
            "   - Extract ONLY information explicitly mentioned in the consultation text or verified encounter context.\n"
            "   - Never invent symptoms, vital signs, physical exam findings, diagnoses, medications, or treatment plans.\n"
            "   - If vital signs or physical examination findings are not mentioned in the transcript or context, "
            "leave them empty or mark as '[Not documented]'. Do NOT assume normal findings.\n\n"
            "2. MULTILINGUAL NEGATION PRESERVATION (CRITICAL):\n"
            "   - Every symptom or condition that is denied or absent MUST be placed in pertinent_negatives.\n"
            "   - Under NO CIRCUMSTANCES should a negated finding appear in reported_symptoms or primary_impression.\n"
            "   - Recognize negation cues across languages:\n"
            "     * English: no, denies, denied, without, negative for, not having, free of\n"
            "     * Kannada: ಇಲ್ಲ (illa), ಆಗುತ್ತಿಲ್ಲ (aaguthilla), ಇಲ್ಲವೇ ಇಲ್ಲ, ಕಂಡುಬಂದಿಲ್ಲ\n"
            "     * Kanglish: illa, aagthilla, aagutilla, yellu illa, bedvu\n"
            "     * Hindi: नहीं (nahi), नहीं है, नहीं हो रहा, कोई नहीं, इनकार किया\n"
            "     * Hinglish: nahi, nahin, nahi hai, nahi ho raha, koi nahi, mana kiya\n"
            "   - Examples: 'vomiting illa' -> pertinent_negatives: ['Vomiting']; 'cough nahi hai' -> pertinent_negatives: ['Cough'].\n\n"
            "3. SPEAKER ATTRIBUTION & GROUNDING:\n"
            "   - Clearly attribute patient-reported symptoms ('Patient reports...') versus clinician findings.\n"
            "   - Preserve verbatim or near-verbatim source phrases in the evidence array when possible.\n\n"
            "4. DIAGNOSTIC UNCERTAINTY:\n"
            "   - Preserve explicit uncertainty qualifiers (e.g. 'suspected', 'probable', 'likely', 'rule out', 'evaluating for').\n"
            "   - If a diagnosis is tentative, record it with its uncertainty qualifier in differential_diagnoses "
            "or primary_impression.\n\n"
            "5. ADVISORY MEDICATIONS:\n"
            "   - Proposed medications in the plan are unprescribed draft text. Only extract medications, "
            "dosages, and frequencies explicitly mentioned by the clinician in the consultation.\n\n"
            "OUTPUT FORMAT:\n"
            "Return a pure JSON object conforming exactly to this schema:\n"
            "{\n"
            '  "subjective": {\n'
            '    "chief_complaint": "string",\n'
            '    "history_of_present_illness": "string",\n'
            '    "reported_symptoms": ["string"],\n'
            '    "pertinent_negatives": ["string"],\n'
            '    "evidence": [{"item_text": "string", "source_evidence": "string", "is_negated": false, "uncertainty_qualifier": null}]\n'
            "  },\n"
            '  "objective": {\n'
            '    "vital_signs_summary": "string or null",\n'
            '    "physical_examination": ["string"],\n'
            '    "investigations_reviewed": ["string"],\n'
            '    "evidence": []\n'
            "  },\n"
            '  "assessment": {\n'
            '    "primary_impression": "string",\n'
            '    "differential_diagnoses": ["string"],\n'
            '    "chronic_conditions_status": ["string"],\n'
            '    "evidence": []\n'
            "  },\n"
            '  "plan": {\n'
            '    "diagnostic_workup": ["string"],\n'
            '    "proposed_medications": ["string"],\n'
            '    "patient_instructions": ["string"],\n'
            '    "red_flag_warnings": ["string"],\n'
            '    "follow_up": "string or null",\n'
            '    "evidence": []\n'
            "  }\n"
            "}"
        )

    def _build_user_prompt(
        self,
        request: SOAPGenerateRequest,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        prompt_parts: List[str] = [
            f"CONSULTATION LANGUAGE: {request.language_code}",
            "",
            "CONSULTATION TRANSCRIPT / DICTATION TEXT:",
            "\"\"\"",
            request.consultation_text,
            "\"\"\"",
        ]

        if context:
            prompt_parts.append("")
            prompt_parts.append("VERIFIED CLINICAL ENCOUNTER CONTEXT:")
            if context.get("demographics"):
                d = context["demographics"]
                prompt_parts.append(f"- Demographics: Age {d.get('calculated_age', 'Unknown')}, Gender: {d.get('gender', 'Unknown')}")
            if context.get("vital_signs"):
                v = context["vital_signs"]
                v_strs = [f"{k}: {val}" for k, val in v.items() if val is not None]
                if v_strs:
                    prompt_parts.append(f"- Encounter Vitals: {', '.join(v_strs)}")
            if context.get("allergies"):
                al = context["allergies"]
                doc = [a.get("substance", "") for a in al.get("documented", []) if a.get("substance")]
                if doc:
                    prompt_parts.append(f"- Known Allergies: {', '.join(doc)}")
            if context.get("medications"):
                meds = context["medications"]
                act = [m.get("medication", {}).get("generic_name", "") for m in meds.get("active", []) if m.get("medication")]
                if act:
                    prompt_parts.append(f"- Active Outpatient Medications: {', '.join(act)}")
            if context.get("medical_history_active"):
                prompt_parts.append(f"- Active Comorbidities: {', '.join(context['medical_history_active'])}")

        prompt_parts.append("")
        prompt_parts.append("Generate the complete clinical SOAP note draft JSON now.")
        return "\n".join(prompt_parts)

    def _build_request_payload(
        self,
        request: SOAPGenerateRequest,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        generation_config: Dict[str, Any] = {
            "responseMimeType": "application/json",
        }
        # For gemini-3.5 and flash-lite models, specify thinkingConfig.thinkingLevel and omit temperature
        if "3.5" in self.model or "flash-lite" in self.model:
            generation_config["thinkingConfig"] = {
                "thinkingLevel": "MINIMAL"
            }
        else:
            generation_config["temperature"] = 0.1

        return {
            "systemInstruction": {
                "parts": [{"text": self._build_system_instruction()}],
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": self._build_user_prompt(request, context)}],
                }
            ],
            "generationConfig": generation_config,
        }

    # ------------------------------------------------------------------------
    # HTTP Request Execution with Bounded Retry
    # ------------------------------------------------------------------------

    def _execute_gemini_request(self, payload: Dict[str, Any]) -> str:
        """Call Gemini REST API with bounded exponential backoff retries."""
        url = f"{self.BASE_API_URL}/{self.model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self._api_key,
        }

        retry_statuses = {429, 503}
        last_error: Optional[Exception] = None

        client = self._http_client or httpx.Client()
        should_close_client = self._http_client is None

        try:
            for attempt in range(self.max_retries + 1):
                try:
                    response = client.post(
                        url,
                        headers=headers,
                        json=payload,
                        timeout=self.timeout,
                    )

                    # Success (200 OK)
                    if response.status_code == 200:
                        return response.text

                    # Rate limit (429) or Service Unavailable (503) -> Retry
                    if response.status_code in retry_statuses and attempt < self.max_retries:
                        sleep_time = self.backoff_factor * (2 ** attempt)
                        logger.warning(
                            f"Gemini API returned status {response.status_code}. "
                            f"Retrying in {sleep_time:.2f}s (attempt {attempt + 1}/{self.max_retries})."
                        )
                        time.sleep(sleep_time)
                        continue

                    # Non-transient Authentication/Authorization error (401 / 403)
                    if response.status_code in (401, 403):
                        raise GeminiAuthenticationError(
                            "Gemini API authentication failed (HTTP 401/403). "
                            "Verify that your GEMINI_API_KEY is active and has permission to access Generative Language API."
                        )

                    # Exhausted Rate Limit (429)
                    if response.status_code == 429:
                        raise GeminiRateLimitError(
                            f"Gemini API rate limit exceeded (HTTP 429) after {self.max_retries} retries."
                        )

                    # Service Unavailable (503)
                    if response.status_code == 503:
                        raise GeminiServiceUnavailableError(
                            f"Gemini API is temporarily unavailable (HTTP 503 Service Unavailable) after {self.max_retries} retries."
                        )

                    # Bad Request (400)
                    if response.status_code == 400:
                        sanitized_body = response.text[:200].replace(self._api_key, "********")
                        raise GeminiBadRequestError(
                            f"Gemini API request was rejected (HTTP 400): {sanitized_body}"
                        )

                    # Model Not Found / Unavailable (HTTP 404)
                    if response.status_code == 404:
                        sanitized_body = response.text[:200].replace(self._api_key, "********")
                        raise GeminiModelNotFoundError(
                            f"Gemini model '{self.model}' was not found or is unavailable for this API project (HTTP 404). "
                            f"Verify that '{self.model}' is enabled for your Google GenAI API key. "
                            f"Details: {sanitized_body}"
                        )

                    # Other HTTP error
                    response.raise_for_status()

                except (httpx.TimeoutException, httpx.ConnectError) as exc:
                    last_error = exc
                    if attempt < self.max_retries:
                        sleep_time = self.backoff_factor * (2 ** attempt)
                        logger.warning(
                            f"Network error during Gemini request: {type(exc).__name__}. "
                            f"Retrying in {sleep_time:.2f}s (attempt {attempt + 1}/{self.max_retries})."
                        )
                        time.sleep(sleep_time)
                        continue
                    raise GeminiTimeoutError(
                        f"Gemini API request timed out or connection failed after "
                        f"{self.timeout}s threshold ({type(exc).__name__})."
                    ) from exc

                except GeminiAdapterError:
                    raise

                except Exception as exc:
                    last_error = exc
                    sanitized_msg = str(exc).replace(self._api_key, "********")
                    raise GeminiAdapterError(f"Unexpected error calling Gemini API: {sanitized_msg}") from exc

            # If loop ends without success
            if last_error:
                raise GeminiAdapterError(f"Gemini API request failed after {self.max_retries} attempts.") from last_error
            raise GeminiAdapterError("Gemini API request failed unexpectedly.")

        finally:
            if should_close_client:
                client.close()

    # ------------------------------------------------------------------------
    # Response Parsing & Schema Validation
    # ------------------------------------------------------------------------

    def _parse_and_validate_response(self, raw_json_str: str) -> SOAPPayload:
        """Parse Gemini REST response text and validate against SOAPPayload schema."""
        try:
            api_data = json.loads(raw_json_str)
        except json.JSONDecodeError as exc:
            raise GeminiResponseParsingError(f"Gemini API response is not valid JSON: {str(exc)}") from exc

        candidates = api_data.get("candidates", [])
        if not candidates:
            feedback = api_data.get("promptFeedback", {})
            block_reason = feedback.get("blockReason", "Unknown")
            raise GeminiResponseParsingError(
                f"Gemini API returned zero candidates. Safety block reason: {block_reason}"
            )

        candidate = candidates[0]
        content = candidate.get("content", {})
        parts = content.get("parts", [])
        if not parts or "text" not in parts[0]:
            raise GeminiResponseParsingError("Gemini API candidate content is missing text parts.")

        model_text = parts[0]["text"].strip()

        # Clean markdown code fences if present (e.g. ```json ... ```)
        if model_text.startswith("```"):
            model_text = re.sub(r"^```(?:json)?\s*", "", model_text)
            model_text = re.sub(r"\s*```$", "", model_text)
            model_text = model_text.strip()

        try:
            soap_dict = json.loads(model_text)
        except json.JSONDecodeError as exc:
            raise GeminiResponseParsingError(
                f"Gemini model output did not contain parseable JSON: {str(exc)}. Content snippet: {model_text[:120]}"
            ) from exc

        if not isinstance(soap_dict, dict):
            raise GeminiResponseParsingError(f"Expected JSON object in model output, got {type(soap_dict).__name__}")

        # Normalise and validate section shapes
        subjective_dict = soap_dict.get("subjective", {})
        objective_dict = soap_dict.get("objective", {})
        assessment_dict = soap_dict.get("assessment", {})
        plan_dict = soap_dict.get("plan", {})

        # Normalize evidence items (handle both 'text' and 'item_text')
        for section in (subjective_dict, objective_dict, assessment_dict, plan_dict):
            if isinstance(section, dict) and "evidence" in section:
                section["evidence"] = _normalize_evidence_items(section.get("evidence", []))

        # Ensure required string fields exist with clinical fallbacks if missing
        if not subjective_dict.get("chief_complaint"):
            subjective_dict["chief_complaint"] = "[Not documented]"
        if not subjective_dict.get("history_of_present_illness"):
            subjective_dict["history_of_present_illness"] = "[Not documented]"
        if not assessment_dict.get("primary_impression"):
            assessment_dict["primary_impression"] = "[Clinical assessment pending]"

        try:
            soap_payload = SOAPPayload(
                subjective=SubjectiveSection.model_validate(subjective_dict),
                objective=ObjectiveSection.model_validate(objective_dict),
                assessment=AssessmentSection.model_validate(assessment_dict),
                plan=PlanSection.model_validate(plan_dict),
            )
            return soap_payload
        except Exception as exc:
            raise GeminiResponseParsingError(
                f"Gemini SOAP output failed schema validation: {str(exc)}"
            ) from exc

    # ------------------------------------------------------------------------
    # Deterministic Post-Processing Safety Sanitizer
    # ------------------------------------------------------------------------

    def _sanitize_and_verify_safety(
        self,
        payload: SOAPPayload,
        request: SOAPGenerateRequest,
        context: Optional[Dict[str, Any]] = None,
    ) -> SOAPPayload:
        """Deterministic safety rail enforcing clinical rules on Gemini output.

        1. Qualified Positive Protection:
           Symptoms where 'not' qualifies severity, progression, or treatment response
           (e.g., 'headache, not severe', 'fever not resolving', 'no improvement in headache')
           remain strictly in reported_symptoms.
        2. Verified True Absence:
           Unambiguous negative cues ('no fever', 'vomiting illa', 'cough nahi hai')
           are verified against consultation text evidence before moving to pertinent_negatives.
        3. Ambiguity & Contradiction Surfacing:
           Ambiguous statements or contradictory findings are flagged for clinician review
           via ExtractedItem evidence rather than silently rewriting clinical facts.
        4. Background context enrichment: Attaches verified patient context.
        """
        sanitized_reported: List[str] = []
        identified_negatives: List[str] = list(payload.subjective.pertinent_negatives)
        transcript_lower = request.consultation_text.lower()

        for sym in payload.subjective.reported_symptoms:
            sym_clean = sym.strip()
            if not sym_clean:
                continue

            # 1. Qualified positive symptoms (severity / progression / treatment response)
            if _QUALIFIED_POSITIVE_RE.search(sym_clean):
                sanitized_reported.append(sym_clean)
                payload.subjective.evidence.append(
                    ExtractedItem(
                        text=sym_clean,
                        source_evidence=sym_clean,
                        is_negated=False,
                        uncertainty_qualifier="Qualified symptom (severity/progression/response documented)",
                    )
                )
                continue

            # 2. Unambiguous true absence (leading or trailing negation)
            lead_match = _TRUE_ABSENCE_LEADING_RE.match(sym_clean)
            trail_match = _TRUE_ABSENCE_TRAILING_RE.match(sym_clean)

            if lead_match or trail_match:
                raw_concept = (lead_match.group(1) if lead_match else trail_match.group(1)).strip()
                concept = _strip_negation_cues(raw_concept)
                concept_lower = concept.lower()

                # Verify absence is grounded in original consultation text
                if concept_lower in transcript_lower or len(concept_lower) < 4:
                    neg_label = f"Denies {concept}" if not concept.lower().startswith("denies") else concept
                    if neg_label not in identified_negatives:
                        identified_negatives.append(neg_label)
                    payload.subjective.evidence.append(
                        ExtractedItem(
                            text=sym_clean,
                            source_evidence=sym_clean,
                            is_negated=True,
                            uncertainty_qualifier=None,
                        )
                    )
                    continue
                else:
                    # Ungrounded negation: keep in reported symptoms, flag uncertainty
                    sanitized_reported.append(sym_clean)
                    payload.subjective.evidence.append(
                        ExtractedItem(
                            text=sym_clean,
                            source_evidence=None,
                            is_negated=False,
                            uncertainty_qualifier="Unverified negation: not explicitly confirmed in consultation transcript",
                        )
                    )
                    continue

            # 3. General negation cue present, but structure is ambiguous
            if _ANY_NEGATION_RE.search(sym_clean):
                sanitized_reported.append(sym_clean)
                payload.subjective.evidence.append(
                    ExtractedItem(
                        text=sym_clean,
                        source_evidence=sym_clean,
                        is_negated=False,
                        uncertainty_qualifier="Ambiguous clinical negation: clinician review required",
                    )
                )
                continue

            # 4. Standard positive symptom
            sanitized_reported.append(sym_clean)

        # 5. Prevent contradiction: If a negative finding matches a reported symptom
        final_reported: List[str] = []
        neg_lower_set = {n.lower() for n in identified_negatives}
        for r in sanitized_reported:
            r_core = r.lower().replace("patient reports", "").strip()
            # If the symptom is explicitly denied in pertinent negatives
            if any(r_core in n or n in r_core for n in neg_lower_set if len(r_core) > 2):
                # Flag contradiction for physician verification
                payload.subjective.evidence.append(
                    ExtractedItem(
                        text=r,
                        source_evidence=r,
                        is_negated=False,
                        uncertainty_qualifier="Contradictory finding: reported as present and denied. Requires clinician verification.",
                    )
                )
                # Pertinent negative takes conservative precedence
                continue
            final_reported.append(r)

        payload.subjective.reported_symptoms = final_reported
        payload.subjective.pertinent_negatives = identified_negatives

        # 6. Transcript Grounding for Diagnostic Workup & Investigations
        sanitized_workup: List[str] = []
        clinical_stopwords = {
            "if", "fever", "persists", "present", "patient", "doctor", "notes",
            "days", "hours", "test", "tests", "needed", "indicated", "consider",
            "review", "repeat", "check", "order", "advise", "advised", "return",
            "routine", "stat", "urgent", "optional", "baseline", "investigation",
            "investigations", "and", "or", "for", "the", "with", "per", "from",
            "into", "also", "any", "all", "non", "not", "profile", "panel",
            "level", "levels", "screen", "screening"
        }
        for test_item in payload.plan.diagnostic_workup:
            test_clean = test_item.strip()
            if not test_clean:
                continue
            investigation_keywords = [
                k for k in re.findall(r"\b(?:[A-Z0-9]{2,}|[a-zA-Z]{3,})\b", test_clean)
                if k.lower() not in clinical_stopwords
            ]
            is_grounded = bool(investigation_keywords) and any(k.lower() in transcript_lower for k in investigation_keywords)
            if is_grounded:
                sanitized_workup.append(test_clean)
            else:
                payload.plan.evidence.append(
                    ExtractedItem(
                        text=test_clean,
                        source_evidence=None,
                        is_negated=False,
                        uncertainty_qualifier="Unsupported investigation removed: not ordered in consultation transcript",
                    )
                )
        payload.plan.diagnostic_workup = sanitized_workup

        # 7. Transcript Grounding for Follow-up Schedule & Duration
        if payload.plan.follow_up:
            fu_text = payload.plan.follow_up.strip()
            is_grounded, reason = is_follow_up_grounded(fu_text, request.consultation_text)
            if not is_grounded:
                payload.plan.evidence.append(
                    ExtractedItem(
                        text=fu_text,
                        source_evidence=None,
                        is_negated=False,
                        uncertainty_qualifier=reason,
                    )
                )
                payload.plan.follow_up = "[Follow-up schedule not documented]"

        # 7b. Transcript Grounding for Red Flag Return Warnings
        sanitized_warnings: List[str] = []
        for warning in payload.plan.red_flag_warnings:
            w_clean = warning.strip()
            if not w_clean:
                continue
            is_w_grounded, w_reason = is_follow_up_grounded(w_clean, request.consultation_text)
            if is_w_grounded:
                sanitized_warnings.append(w_clean)
            else:
                payload.plan.evidence.append(
                    ExtractedItem(
                        text=w_clean,
                        source_evidence=None,
                        is_negated=False,
                        uncertainty_qualifier=f"Unsupported return precaution removed: {w_reason}",
                    )
                )
        payload.plan.red_flag_warnings = sanitized_warnings

        # 8. Context attachment (if context provided)
        if context and not payload.patient_context:
            payload.patient_context = DeterministicMockSOAPAdapter()._build_patient_context(context)

        return payload


# ============================================================================
# Helper Functions
# ============================================================================


def _strip_negation_cues(text: str) -> str:
    """Strip negation words to isolate the underlying symptom concept."""
    cleaned = _EN_NEGATION_RE.sub("", text)
    cleaned = _KN_NEGATION_RE.sub("", cleaned)
    cleaned = _KANGLISH_NEGATION_RE.sub("", cleaned)
    cleaned = _HI_NEGATION_RE.sub("", cleaned)
    cleaned = _HINGLISH_NEGATION_RE.sub("", cleaned)
    # Clean up leading/trailing punctuation and whitespace
    cleaned = re.sub(r"^[,\s;:-]+|[,\s;:-]+$", "", cleaned)
    return cleaned.strip() or text.strip()


def _normalize_evidence_items(evidence_list: Any) -> List[Dict[str, Any]]:
    """Normalize evidence items to comply with ExtractedItem schema."""
    normalized: List[Dict[str, Any]] = []
    if not isinstance(evidence_list, list):
        return normalized
    for item in evidence_list:
        if isinstance(item, dict):
            item_copy = dict(item)
            if "text" not in item_copy and "item_text" in item_copy:
                item_copy["text"] = item_copy.pop("item_text")
            elif "text" not in item_copy:
                item_copy["text"] = item_copy.get("finding", "Clinical statement")
            normalized.append(item_copy)
        elif isinstance(item, str):
            normalized.append({"text": item, "source_evidence": item, "is_negated": False})
    return normalized


def is_follow_up_grounded(follow_up: Optional[str], transcript: str) -> Tuple[bool, str]:
    """Validate whether a follow-up instruction or return precaution is clinically grounded in the transcript.

    Distinguishes:
    A. Scheduled follow-up: e.g. 'Return after 48 hours', 'Follow up in 3 days'
       - Any timeframe/duration must be supported by the transcript.
    B. Event-triggered return instruction: e.g. 'Return immediately if persistent vomiting or rash appears'
       - Trigger conditions/symptoms must be supported by the transcript.
       - 'immediately' is accepted when documented in the transcript.
    C. Missing follow-up:
       - None, empty, or explicit '[Follow-up schedule not documented]' / '[Not documented]'.
    """
    if not follow_up or follow_up.strip() in (
        "",
        "[Follow-up schedule not documented]",
        "[Not documented]",
        "Not documented",
        "None",
        "None documented",
    ):
        return True, "No scheduled follow-up documented"

    fu_clean = follow_up.strip()
    fu_lower = fu_clean.lower()
    tx_lower = transcript.lower()

    # 1. Scheduled follow-up durations (e.g., "48 hours", "3 days", "2 weeks", "2 din", "2 dina")
    duration_matches = re.findall(r"\b(\d+\s*(?:hours?|days?|weeks?|months?|din|dina))\b", fu_lower)
    for dur in duration_matches:
        norm_dur = re.sub(r"\s+", " ", dur)
        norm_tx = re.sub(r"\s+", " ", tx_lower)
        if norm_dur not in norm_tx:
            return False, f"Invented follow-up duration '{dur}' not documented in transcript"

    # 2. Event-triggered return precautions (e.g. "return immediately if vomiting persists", "return if rash appears")
    trigger_match = re.search(r"\b(?:if|in case of|when)\b\s*([^.,;\n]+)", fu_lower)
    if trigger_match:
        trigger_clause = trigger_match.group(1)
        stopwords = {
            "or", "and", "any", "the", "a", "an", "appears", "appear", "occurs", "occur",
            "develops", "develop", "persists", "persist", "worsens", "worsen", "gets", "worse",
            "severe", "mild", "high", "moderate", "new"
        }
        trigger_keywords = [
            w for w in re.findall(r"\b[a-zA-Z]{3,}\b", trigger_clause)
            if w not in stopwords
        ]
        if trigger_keywords and not any(k in tx_lower for k in trigger_keywords):
            return False, f"Invented return precaution trigger '{trigger_clause.strip()}' not documented in transcript"

    # 3. Urgency modifier: 'immediately'
    if "immediately" in fu_lower and "immediately" not in tx_lower:
        if not any(k in tx_lower for k in ("urgent", "emergency", "stat", "promptly")):
            return False, "Invented 'immediately' urgency not documented in transcript"

    # 4. General clinical grounding check
    clinical_words = [
        w for w in re.findall(r"\b[a-zA-Z]{4,}\b", fu_lower)
        if w not in {
            "return", "follow", "review", "after", "schedule", "patient", "advised", "doctor",
            "instruction", "instructions", "clinic", "hospital", "visit", "consult", "general",
            "routine", "prescribed", "needed", "necessary", "required", "case", "persists",
            "appears", "worsens", "hours", "days", "weeks"
        }
    ]
    if clinical_words and not any(w in tx_lower for w in clinical_words):
        return False, f"Follow-up instruction '{fu_clean}' has no clinical grounding in transcript"

    return True, "Follow-up instruction is grounded in transcript"

