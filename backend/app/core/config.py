from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "KULTUR Dashboard"
    environment: str = "local"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/kultur"
    secret_key: str = "change-me-before-production"
    access_token_expire_minutes: int = 60 * 8
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,https://kultur-frontend-jljp.onrender.com"
    auto_create_tables: bool = True
    first_superuser_email: str = "admin@kultur-dz.com"
    first_superuser_password: str = "ChangeMe123!"
    first_superuser_name: str = "مدير النظام"
    upload_max_rows: int = Field(default=2000, ge=1)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
