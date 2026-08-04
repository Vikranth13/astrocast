from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


FreshnessStatus = Literal[
    "current",
    "delayed",
    "stale",
]

ActivityLevel = Literal[
    "below_storm",
    "minor",
    "moderate",
    "strong",
    "severe",
    "extreme",
]

NoaaGeomagneticScale = Literal[
    "G1",
    "G2",
    "G3",
    "G4",
    "G5",
]


class SpaceWeatherFreshness(BaseModel):
    """
    Describes the age of the latest observation.
    """

    status: FreshnessStatus

    age_minutes: int = Field(
        ge=0,
    )


class GeomagneticActivity(BaseModel):
    """
    AstroCast interpretation of the NOAA
    geomagnetic storm classification.
    """

    level: ActivityLevel

    label: str

    noaa_scale: NoaaGeomagneticScale | None

    is_storm: bool


class PlanetaryKpFacts(BaseModel):
    """
    Scientific and source facts associated with
    the latest stored Kp measurement.
    """

    kp: float = Field(
        ge=0,
        le=9,
    )

    a_running: int | None = Field(
        default=None,
        ge=0,
    )

    station_count: int | None = Field(
        default=None,
        ge=0,
    )


class CurrentSpaceWeatherResponse(BaseModel):
    """
    User-facing response for the newest stored
    planetary K-index observation.
    """

    source: str

    metric_name: str

    observed_at: datetime

    ingested_at: datetime

    freshness: SpaceWeatherFreshness

    geomagnetic_activity: GeomagneticActivity

    facts: PlanetaryKpFacts

    explanation: str