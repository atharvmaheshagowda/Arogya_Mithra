from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Arogya Mithra"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./Arogya.db"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

