from pathlib import Path
from typing import Optional
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SUPPORTED_LLM_PROVIDERS = {"mock", "gemini", "openai", "generic_http"}

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
AUTHORITATIVE_DB_PATH = PROJECT_ROOT / "Arogya.db"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Arogya Mithra"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = Field(
        default=f"sqlite:///{AUTHORITATIVE_DB_PATH.as_posix()}",
        description="Authoritative SQLite database URL anchored to project repository root",
    )
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Phase 5C LLM Provider Settings
    LLM_PROVIDER: str = Field(
        default="mock",
        description="LLM provider for clinical note generation ('mock', 'gemini', 'openai', 'generic_http')",
    )
    LLM_API_KEY: Optional[SecretStr] = Field(
        default=None,
        description="Optional API key for external LLM provider (masked in logs/repr)",
    )
    GEMINI_API_KEY: Optional[SecretStr] = Field(
        default=None,
        description="Optional Gemini API key for Google Generative AI endpoints (masked in logs/repr)",
    )
    LLM_MODEL: Optional[str] = Field(
        default=None,
        description="Optional model identifier specified by deployment (not hardcoded to outdated models)",
    )
    LLM_TIMEOUT_SECONDS: float = Field(
        default=30.0,
        ge=1.0,
        le=120.0,
        description="Timeout in seconds for LLM generation requests (1.0 - 120.0)",
    )
    LLM_FALLBACK_TO_MOCK: bool = Field(
        default=True,
        description="Fallback to DeterministicMockSOAPAdapter if external provider fails or times out",
    )
    LLM_BASE_URL: Optional[str] = Field(
        default=None,
        description="Optional base URL for OpenAI-compatible or local inference endpoints",
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def resolve_database_url(cls, value: str) -> str:
        if isinstance(value, str):
            if value == "sqlite:///./Arogya.db" or value.startswith("sqlite:///./"):
                rel_file = value[len("sqlite:///./") :]
                abs_path = (PROJECT_ROOT / rel_file).resolve()
                return f"sqlite:///{abs_path.as_posix()}"
        return value

    @field_validator("LLM_PROVIDER", mode="before")
    @classmethod
    def validate_llm_provider(cls, value: str) -> str:
        if isinstance(value, str):
            cleaned = value.strip().lower()
            if cleaned not in SUPPORTED_LLM_PROVIDERS:
                raise ValueError(
                    f"Unsupported LLM_PROVIDER '{value}'. "
                    f"Supported providers: {', '.join(sorted(SUPPORTED_LLM_PROVIDERS))}"
                )
            return cleaned
        return value

    def get_gemini_api_key(self) -> Optional[str]:
        """Retrieve Gemini API key with fallback to generic LLM_API_KEY."""
        if self.GEMINI_API_KEY:
            return self.GEMINI_API_KEY.get_secret_value()
        if self.LLM_API_KEY:
            return self.LLM_API_KEY.get_secret_value()
        return None

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

