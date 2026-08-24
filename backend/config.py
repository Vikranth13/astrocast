from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """
    Central application configuration.

    Values are loaded from the project-root .env file.
    """

    app_name: str = "AstroCast API"

    database_url: str

    nasa_api_key: str = "DEMO_KEY"

    open_meteo_geocoding_url: str = (
        "https://geocoding-api.open-meteo.com/v1/search"
    )

    open_meteo_forecast_url: str = (
        "https://api.open-meteo.com/v1/forecast"
    )

    noaa_planetary_k_index_url: str = (
        "https://services.swpc.noaa.gov/products/"
        "noaa-planetary-k-index.json"
    )

    noaa_alerts_url: str = (
        "https://services.swpc.noaa.gov/products/alerts.json"
    )

    noaa_request_timeout_seconds: int = 15

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """
    Build the settings object once and reuse it.
    """

    return Settings()


settings = get_settings()