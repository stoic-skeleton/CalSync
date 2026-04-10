from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://calsync:calsync@localhost:5432/calsync"
    redis_url: str = "redis://localhost:6379/0"
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"

    # Auth / JWT
    secret_key: str | None = None
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Google OAuth (set in env for production)
    google_client_id: str | None = None
    google_client_secret: str | None = None

    # Cookie
    session_cookie_name: str = "calsync_session"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
