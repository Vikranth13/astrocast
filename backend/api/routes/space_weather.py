from fastapi import APIRouter, Depends, Query
from datetime import datetime
from typing import Literal

from sqlalchemy.orm import Session

from database import get_db
from schemas.errors import ErrorResponse
from schemas.space_weather import (
    AlertSeverity,
    AlertStatus,
    AlertType,
    CurrentSpaceWeatherResponse,
    SpaceWeatherAlertDetailResponse,
    SpaceWeatherAlertListResponse,
    SpaceWeatherTrendResponse,
    SolarWindTrendResponse,
    CurrentSpaceWeatherRiskResponse,
)
from services.space_weather_service import (
    get_current_space_weather,
    get_space_weather_alerts,
    get_space_weather_alert,
    get_kp_trend,
    get_solar_wind_trend,
    get_current_space_weather_risk,
)


router = APIRouter(
    prefix="/api/space-weather",
    tags=["space-weather"],
)


# These routes read stored measurements and never
# call NOAA, so they stay available during an upstream
# outage and do not document a 502.
NO_DATA_RESPONSE = {
    404: {
        "model": ErrorResponse,
        "description": (
            "No stored data is available yet. "
            "Run NOAA ingestion first."
        ),
    },
}

VALIDATION_RESPONSE = {
    422: {
        "model": ErrorResponse,
        "description": (
            "A query parameter failed validation."
        ),
    },
}


@router.get(
    "/current",
    response_model=CurrentSpaceWeatherResponse,
    responses=NO_DATA_RESPONSE,
    summary="Get current space weather",
)
def current_space_weather(
    db: Session = Depends(get_db),
):
    """
    Return the newest stored NOAA Planetary K-index
    observation, with its geomagnetic classification,
    data freshness, and a deterministic explanation.
    """

    return get_current_space_weather(
        db
    )


@router.get(
    "/alerts",
    response_model=(
        SpaceWeatherAlertListResponse
    ),
    responses=VALIDATION_RESPONSE,
    summary="List space-weather alerts",
)
def list_space_weather_alerts(
    severity: AlertSeverity | None = Query(
        default=None,
        description=(
            "NOAA scale code. G is geomagnetic "
            "storm, R is radio blackout, S is solar "
            "radiation storm."
        ),
    ),
    type: AlertType | None = Query(
        default=None,
        description=(
            "Notification kind. An alert has been "
            "observed, a warning is expected, a watch "
            "is possible."
        ),
    ),
    source: Literal[
        "NOAA_SWPC"
    ] | None = Query(
        default=None,
        description=(
            "Originating data source."
        ),
    ),
    issued_start: datetime | None = Query(
        default=None,
        description=(
            "Only alerts issued at or after this "
            "time. ISO 8601."
        ),
    ),
    issued_end: datetime | None = Query(
        default=None,
        description=(
            "Only alerts issued at or before this "
            "time. ISO 8601."
        ),
    ),
    status: AlertStatus | None = Query(
        default=None,
        description=(
            "Active or expired, judged against the "
            "stored expiry time. Alerts NOAA sent "
            "without an expiry are unknown."
        ),
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
        description=(
            "Maximum alerts to return, newest first."
        ),
    ),
    db: Session = Depends(get_db),
):
    """
    Return stored space-weather alerts, newest first.

    Filters combine with AND.
    """

    return get_space_weather_alerts(
        db=db,
        severity=severity,
        alert_type=type,
        source=source,
        issued_start=issued_start,
        issued_end=issued_end,
        status=status,
        limit=limit,
    )


@router.get(
    "/alerts/{alert_id}",
    response_model=(
        SpaceWeatherAlertDetailResponse
    ),
    responses={
        404: {
            "model": ErrorResponse,
            "description": (
                "No alert has this id."
            ),
        },
    },
    summary="Get one space-weather alert",
)
def space_weather_alert_detail(
    alert_id: int,
    db: Session = Depends(get_db),
):
    """
    Return one stored alert with a deterministic
    explanation of what it means.
    """

    return get_space_weather_alert(
        db=db,
        alert_id=alert_id,
    )


@router.get(
    "/trends/kp",
    response_model=(
        SpaceWeatherTrendResponse
    ),
    responses=VALIDATION_RESPONSE,
    summary="Get historical Kp trend",
)
def kp_trend(
    start: datetime | None = Query(
        default=None,
        description=(
            "Earliest observation time to include. "
            "ISO 8601."
        ),
    ),
    end: datetime | None = Query(
        default=None,
        description=(
            "Latest observation time to include. "
            "ISO 8601."
        ),
    ),
    limit: int = Query(
        default=500,
        ge=1,
        le=2000,
        description=(
            "Maximum points to return."
        ),
    ),
    db: Session = Depends(get_db),
):
    """
    Return stored planetary K-index observations as
    chart-ready points ordered by observation time.
    """

    return get_kp_trend(
        db=db,
        start=start,
        end=end,
        limit=limit,
    )


@router.get(
    "/trends/solar-wind",
    response_model=(
        SolarWindTrendResponse
    ),
    responses=VALIDATION_RESPONSE,
    summary="Get solar-wind trend",
)
def solar_wind_trend(
    start: datetime | None = Query(
        default=None,
        description=(
            "Earliest observation time to include. "
            "ISO 8601."
        ),
    ),
    end: datetime | None = Query(
        default=None,
        description=(
            "Latest observation time to include. "
            "ISO 8601."
        ),
    ),
    limit: int = Query(
        default=500,
        ge=1,
        le=2000,
        description=(
            "Maximum points to return."
        ),
    ),
    db: Session = Depends(get_db),
):
    """
    Return stored solar-wind readings, grouping the
    speed, density, and temperature measurements
    recorded for each observation time.
    """

    return get_solar_wind_trend(
        db=db,
        start=start,
        end=end,
        limit=limit,
    )


@router.get(
    "/risk",
    response_model=(
        CurrentSpaceWeatherRiskResponse
    ),
    responses=NO_DATA_RESPONSE,
    summary=(
        "Get current deterministic "
        "space-weather risk"
    ),
)
def current_space_weather_risk(
    db: Session = Depends(get_db),
):
    """
    Return the current AstroCast risk assessment.

    Raw measurements stay separate from the
    interpretation, and every contributing factor
    carries the rule identifier that produced it.
    """

    return get_current_space_weather_risk(
        db=db
    )
