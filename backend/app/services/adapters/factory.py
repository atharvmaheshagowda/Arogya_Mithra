from typing import Optional

from app.core.config import Settings, settings as default_settings
from app.services.adapters.base import ClinicalNoteAdapter
from app.services.adapters.mock_adapter import DeterministicMockSOAPAdapter


class LLMAdapterNotImplementedError(NotImplementedError):
    """Raised when an external LLM provider is configured but its adapter is not yet implemented."""
    pass


def get_clinical_note_adapter(
    settings: Optional[Settings] = None,
) -> ClinicalNoteAdapter:
    """Factory creating the appropriate ClinicalNoteAdapter based on configuration.

    Requirements:
    1. 'mock' provider returns DeterministicMockSOAPAdapter.
    2. Real providers ('gemini', 'openai', 'generic_http') raise a clear, actionable
       LLMAdapterNotImplementedError until their adapter client is implemented in Phase 5C.2.
    3. Never silently fall back to mock when a real provider was explicitly configured.
    4. Offline and deterministic by default.
    """
    active_settings = settings or default_settings
    provider = active_settings.LLM_PROVIDER.strip().lower()

    if provider == "mock":
        return DeterministicMockSOAPAdapter()

    if provider in ("gemini", "openai", "generic_http"):
        raise LLMAdapterNotImplementedError(
            f"LLM adapter for provider '{provider}' is not yet implemented in Phase 5C.1. "
            "Real HTTP adapter integration will be enabled in Phase 5C.2. "
            "To use offline deterministic generation, set LLM_PROVIDER='mock'."
        )

    raise ValueError(f"Unknown LLM provider '{provider}'.")

