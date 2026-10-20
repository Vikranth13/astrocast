"""
Tests for the local observing forecast.

The forecast must score every hour of the observing night with the same
rules as the headline score, and the /forecast response must match its
declared schema. Open-Meteo is never called: the two network functions
are replaced with a fixed forecast.
"""

from fastapi.testclient import TestClient

import main
from schemas.observe import ForecastResponse
from services import weather_service
from services.weather_service import (
    OBSERVING_NIGHT_HOURS,
    get_forecast_for_city,
    select_observing_night,
)


client = TestClient(main.app)


PARIS = {
    "name": "Paris",
    "region": "Ile-de-France",
    "country": "France",
    "latitude": 48.85,
    "longitude": 2.35,
    "timezone": "Europe/Paris",
}


def hourly_payload(
    hour_count: int = 48,
    cloud_cover: list[int] | None = None,
) -> dict:
    """
    An Open-Meteo hourly block starting at midnight on 19 October.

    Cloud cover defaults to clear skies. Everything else is calm.
    """

    times = [
        f"2026-10-{19 + index // 24}T{index % 24:02d}:00"
        for index in range(hour_count)
    ]

    return {
        "time": times,
        "cloud_cover": (
            cloud_cover
            if cloud_cover is not None
            else [0] * hour_count
        ),
        "precipitation_probability": [0] * hour_count,
        "temperature_2m": [50.0] * hour_count,
        "wind_speed_10m": [5.0] * hour_count,
        "visibility": [16000.0] * hour_count,
    }


def install_fixed_forecast(
    monkeypatch,
    hourly: dict,
) -> None:
    def locate(city):
        return PARIS

    def fetch_weather(latitude, longitude, timezone=None):
        return {
            "hourly": hourly,
        }

    monkeypatch.setattr(
        weather_service,
        "geocode_city",
        locate,
    )

    monkeypatch.setattr(
        weather_service,
        "get_weather_for_location",
        fetch_weather,
    )


# ---------------------------------------------------------------
# Observing night selection
# ---------------------------------------------------------------

def test_night_runs_from_evening_across_midnight() -> None:
    hourly = hourly_payload()

    indexes = select_observing_night(hourly)

    assert len(indexes) == OBSERVING_NIGHT_HOURS

    assert hourly["time"][indexes[0]] == "2026-10-19T18:00"
    assert hourly["time"][indexes[-1]] == "2026-10-20T05:00"


def test_night_is_cut_short_when_the_forecast_ends() -> None:
    hourly = hourly_payload(
        hour_count=20,
    )

    indexes = select_observing_night(hourly)

    assert [
        hourly["time"][index]
        for index in indexes
    ] == [
        "2026-10-19T18:00",
        "2026-10-19T19:00",
    ]


def test_night_is_empty_without_the_start_hour() -> None:
    hourly = hourly_payload(
        hour_count=12,
    )

    assert select_observing_night(hourly) == []


# ---------------------------------------------------------------
# Forecast assembly
# ---------------------------------------------------------------

def test_every_night_hour_is_scored(
    monkeypatch,
) -> None:
    # Overcast until 22:00, then clear.
    cloud_cover = [
        100 if index < 22 else 0
        for index in range(48)
    ]

    install_fixed_forecast(
        monkeypatch,
        hourly_payload(
            cloud_cover=cloud_cover,
        ),
    )

    forecast = get_forecast_for_city("Paris")

    hours = forecast["hourly"]

    assert len(hours) == OBSERVING_NIGHT_HOURS

    assert hours[0]["time"] == "2026-10-19T18:00"
    assert hours[0]["cloud_cover_percent"] == 100
    assert hours[0]["rating"] == "Poor"

    assert hours[4]["time"] == "2026-10-19T22:00"
    assert hours[4]["score"] == 100

    # The headline hour and its hourly entry are scored identically.
    assert forecast["forecast_time"] == "2026-10-19T22:00"
    assert forecast["stargazing"]["score"] == hours[4]["score"]

    # Metres from Open-Meteo, miles in the response.
    assert hours[0]["visibility_miles"] == 9.94


def test_best_window_covers_the_clear_hours(
    monkeypatch,
) -> None:
    cloud_cover = [
        100 if index < 22 else 0
        for index in range(48)
    ]

    install_fixed_forecast(
        monkeypatch,
        hourly_payload(
            cloud_cover=cloud_cover,
        ),
    )

    window = get_forecast_for_city("Paris")["best_window"]

    assert window["first_hour"] == "2026-10-19T22:00"
    assert window["last_hour"] == "2026-10-20T05:00"
    assert window["hour_count"] == 8
    assert window["qualifies"] is True


# ---------------------------------------------------------------
# Route contract
# ---------------------------------------------------------------

def test_forecast_route_matches_its_schema(
    monkeypatch,
) -> None:
    install_fixed_forecast(
        monkeypatch,
        hourly_payload(),
    )

    response = client.get(
        "/forecast?city=Paris"
    )

    assert response.status_code == 200

    body = response.json()

    ForecastResponse.model_validate(body)

    assert set(body) == {
        "location",
        "forecast_time",
        "conditions",
        "stargazing",
        "hourly",
        "best_window",
    }

    assert body["stargazing"]["limiting_factor"] is None

    assert [
        factor["factor"]
        for factor in body["stargazing"]["factors"]
    ] == [
        "cloud_cover",
        "precipitation_probability",
        "wind_speed",
        "visibility",
    ]
