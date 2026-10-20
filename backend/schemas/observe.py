"""
Response contracts for the local observing routes.

Times here are plain strings rather than datetimes. Open-Meteo returns
them in the location's own time zone with no UTC offset, for example
"2026-10-19T22:00", and parsing them as datetimes would invent a time
zone that the data does not carry.
"""

from typing import Literal

from pydantic import BaseModel, Field


StargazingRating = Literal[
    "Excellent",
    "Good",
    "Okay",
    "Poor",
    "Bad",
]

ScoreFactorName = Literal[
    "cloud_cover",
    "precipitation_probability",
    "wind_speed",
    "visibility",
]


class ForecastLocation(BaseModel):
    """
    The place Open-Meteo geocoding matched to the searched city.
    """

    name: str

    region: str | None

    country: str | None

    latitude: float

    longitude: float

    timezone: str | None


class ForecastConditions(BaseModel):
    """
    Weather conditions for one hourly reading.

    Any value can be missing when Open-Meteo does not supply it.
    """

    cloud_cover_percent: float | None

    precipitation_probability_percent: float | None

    temperature_f: float | None

    wind_speed_mph: float | None

    visibility_miles: float | None


class ScoreFactor(BaseModel):
    """
    How one measured condition moved the stargazing score.

    The note is the same phrase the explanation uses for this
    condition.
    """

    factor: ScoreFactorName

    label: str

    value: float

    unit: str

    penalty: float = Field(
        ge=0,
    )

    is_limiting: bool

    note: str


class StargazingScore(BaseModel):
    """
    The headline score for the forecast hour, with the breakdown that
    produced it.
    """

    score: int = Field(
        ge=0,
        le=100,
    )

    rating: StargazingRating

    explanation: str

    limiting_factor: str | None

    factors: list[ScoreFactor]


class HourlyForecast(ForecastConditions):
    """
    One scored hour of the observing night.
    """

    time: str

    score: int = Field(
        ge=0,
        le=100,
    )

    rating: StargazingRating


class BestObservingWindow(BaseModel):
    """
    The longest run of consecutive hours rated Good or better.

    When no hour reaches Good, this is the single best hour and
    qualifies is False. first_hour and last_hour are the times of the
    first and last readings inside the window.
    """

    first_hour: str

    last_hour: str

    hour_count: int = Field(
        ge=1,
    )

    peak_time: str

    peak_score: int = Field(
        ge=0,
        le=100,
    )

    peak_rating: StargazingRating

    qualifies: bool


class ForecastResponse(BaseModel):
    """
    Tonight's local observing forecast for one city.
    """

    location: ForecastLocation

    forecast_time: str

    conditions: ForecastConditions

    stargazing: StargazingScore

    hourly: list[HourlyForecast]

    best_window: BestObservingWindow | None
