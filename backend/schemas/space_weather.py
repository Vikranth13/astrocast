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

AlertType = Literal[
    "alert",
    "warning",
    "watch",
    "summary",
    "cancellation",
    "other",
]

AlertStatus = Literal[
    "active",
    "expired",
    "unknown",
]

AlertSeverity = Literal[
    "G1",
    "G2",
    "G3",
    "G4",
    "G5",
    "R1",
    "R2",
    "R3",
    "R4",
    "R5",
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
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

class SpaceWeatherAlertResponse(BaseModel):
    """
    Public representation of one persisted
    space-weather notification.
    """

    id: int

    source: str

    external_id: str | None

    alert_type: AlertType

    severity: AlertSeverity | None

    issued_at: datetime

    expires_at: datetime | None

    status: AlertStatus

    summary: str

    ingested_at: datetime


class SpaceWeatherAlertListResponse(BaseModel):
    """
    Filtered collection of persisted
    space-weather alerts.
    """

    count: int = Field(
        ge=0,
    )

    alerts: list[
        SpaceWeatherAlertResponse
    ]

class SpaceWeatherTrendPoint(BaseModel):
    observed_at: datetime
    value: float


class SpaceWeatherTrendResponse(BaseModel):
    source: str

    metric_name: str

    unit: str | None

    count: int = Field(
        ge=0,
    )

    points: list[
        SpaceWeatherTrendPoint
    ]

class SolarWindTrendPoint(BaseModel):
    observed_at: datetime

    station: str | None

    speed_km_s: float | None = None

    density_per_cm3: float | None = None

    temperature_k: float | None = None


class SolarWindTrendResponse(BaseModel):
    source: str

    count: int = Field(
        ge=0,
    )

    points: list[
        SolarWindTrendPoint
    ]