import os
from typing import Optional

from app.core.config import Settings, settings as default_settings
from app.services.adapters.base import ClinicalNoteAdapter
from app.services.adapters.gemini_adapter import (
    GeminiConfigurationError,
    GeminiSOAPAdapter,
    LLMAdapterNotImplementedError,
)
from app.services.adapters.mock_adapter import DeterministicMockSOAPAdapter


def get_clinical_note_adapter(
    settings: Optional[Settings] = None,
) -> ClinicalNoteAdapter:
    """Factory creating the appropriate ClinicalNoteAdapter based on configuration.

    Requirements:
    1. 'mock' provider returns DeterministicMockSOAPAdapter.
    2. 'gemini' provider returns GeminiSOAPAdapter if configured with API key.
       If key is missing, raises GeminiConfigurationError explaining how to configure.
    3. Other real providers ('openai', 'generic_http') raise LLMAdapterNotImplementedError.
    4. Never silently fall back to mock when a real provider was explicitly configured.
    5. Offline and deterministic by default.
    """
    active_settings = settings or default_settings
    provider = active_settings.LLM_PROVIDER.strip().lower()

    if provider == "mock":
        return DeterministicMockSOAPAdapter()

    if provider == "gemini":
        from app.services.adapters.gemini_adapter import (
            GeminiConfigurationError,
            GeminiSOAPAdapter,
        )

        api_key = None
        if hasattr(active_settings, "get_gemini_api_key"):
            api_key = active_settings.get_gemini_api_key()
        elif getattr(active_settings, "GEMINI_API_KEY", None):
            api_key = active_settings.GEMINI_API_KEY.get_secret_value()
        elif getattr(active_settings, "LLM_API_KEY", None):
            api_key = active_settings.LLM_API_KEY.get_secret_value()

        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")

        if not api_key or not api_key.strip():
            raise GeminiConfigurationError(
                f"LLM adapter for provider '{provider}' is not yet implemented without an API key. "
                "GEMINI_API_KEY is not configured. Set the GEMINI_API_KEY environment variable "
                "(or LLM_API_KEY) or switch to LLM_PROVIDER='mock' for offline development."
            )

        return GeminiSOAPAdapter(settings=active_settings)

    if provider in ("openai", "generic_http"):
        raise LLMAdapterNotImplementedError(
            f"LLM adapter for provider '{provider}' is not yet implemented in Phase 5C.1. "
            "Real HTTP adapter integration will be enabled in Phase 5C.2. "
            "To use offline deterministic generation, set LLM_PROVIDER='mock'."
        )

    raise ValueError(f"Unknown LLM provider '{provider}'.")
