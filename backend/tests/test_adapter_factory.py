import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas.clinical_note import SOAPGenerateRequest, SOAPPayload
from app.services.adapters.base import ClinicalNoteAdapter
from app.services.adapters.factory import (
    LLMAdapterNotImplementedError,
    get_clinical_note_adapter,
)
from app.services.adapters.mock_adapter import DeterministicMockSOAPAdapter
from app.services.soap_service import SOAPNoteService


class CustomTestAdapter(ClinicalNoteAdapter):
    """Custom adapter to test explicit injection precedence."""
    def generate_soap_note(self, request, context=None) -> SOAPPayload:
        raise NotImplementedError("Custom test stub")


@pytest.fixture(autouse=True)
def mock_default_env(monkeypatch):
    """Ensure tests run with mock provider default, isolating from runtime .env file."""
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    from app.core.config import settings as app_settings
    monkeypatch.setattr(app_settings, "LLM_PROVIDER", "mock")


def test_default_provider_selects_mock():
    """Test 1: Default configuration selects DeterministicMockSOAPAdapter."""
    settings = Settings()
    assert settings.LLM_PROVIDER == "mock"
    adapter = get_clinical_note_adapter(settings)
    assert isinstance(adapter, DeterministicMockSOAPAdapter)


def test_explicit_mock_provider_selects_mock():
    """Test 2: Explicitly configured mock provider selects DeterministicMockSOAPAdapter."""
    settings = Settings(LLM_PROVIDER="mock")
    adapter = get_clinical_note_adapter(settings)
    assert isinstance(adapter, DeterministicMockSOAPAdapter)


def test_unsupported_provider_is_rejected():
    """Test 3: Unsupported provider name is rejected at configuration validation time."""
    with pytest.raises(ValidationError) as excinfo:
        Settings(LLM_PROVIDER="unsupported_vendor_xyz")
    assert "Unsupported LLM_PROVIDER 'unsupported_vendor_xyz'" in str(excinfo.value)


def test_selecting_real_provider_fails_clearly():
    """Test 4: Selecting an unimplemented real provider fails with actionable error."""
    for provider in ["openai", "generic_http"]:
        settings = Settings(LLM_PROVIDER=provider)
        with pytest.raises(LLMAdapterNotImplementedError) as excinfo:
            get_clinical_note_adapter(settings)
        assert f"provider '{provider}' is not yet implemented" in str(excinfo.value)
        assert "LLM_PROVIDER='mock'" in str(excinfo.value)


def test_explicit_adapter_injection_overrides_configuration():
    """Test 5: Explicit adapter injection into SOAPNoteService takes precedence over factory."""
    custom = CustomTestAdapter()
    service = SOAPNoteService(adapter=custom)
    assert service.adapter is custom

    # Without injection, uses the factory (which selects mock by default)
    default_service = SOAPNoteService()
    assert isinstance(default_service.adapter, DeterministicMockSOAPAdapter)


def test_api_keys_are_not_exposed_in_settings_representation():
    """Test 6: Secret API keys are masked in string representations, dicts, and logs."""
    sensitive_key = "AIzaSySecretApiKey123456789"
    settings = Settings(LLM_PROVIDER="mock", LLM_API_KEY=sensitive_key)
    
    repr_str = repr(settings)
    str_str = str(settings)

    # Must NOT expose raw plaintext secret
    assert sensitive_key not in repr_str
    assert sensitive_key not in str_str
    assert "**********" in repr_str or "SecretStr" in repr_str

    # Value is still retrievable via get_secret_value when needed
    assert settings.LLM_API_KEY.get_secret_value() == sensitive_key


def test_timeout_bounds_validation():
    """Test timeout bounds (ge=1.0, le=120.0)."""
    with pytest.raises(ValidationError):
        Settings(LLM_TIMEOUT_SECONDS=0.5)

    with pytest.raises(ValidationError):
        Settings(LLM_TIMEOUT_SECONDS=200.0)

    valid_settings = Settings(LLM_TIMEOUT_SECONDS=30.0)
    assert valid_settings.LLM_TIMEOUT_SECONDS == 30.0

