from fastapi import APIRouter, Depends, Query
from datetime import datetime
from typing import Literal

from sqlalchemy.orm import Session

from database import get_db
from schemas.space_weather import (
    AlertSeverity,
    AlertStatus,
    AlertType,
    CurrentSpaceWeatherResponse,
    SpaceWeatherAlertListResponse,
    SpaceWeatherAlertResponse,
)
from services.space_weather_service import (
    get_current_space_weather,
    get_space_weather_alerts,
    get_space_weather_alert,
)


router = APIRouter(
    prefix="/api/space-weather",
    tags=["space-weather"],
)


@router.get(
    "/current",
    response_model=CurrentSpaceWeatherResponse,
    summary="Get current space weather",
)
def current_space_weather(
    db: Session = Depends(get_db),
):
    """
    Return the newest stored NOAA Planetary
    K-index observation.
    """

    return get_current_space_weather(
        db
    )

@router.get(
    "/alerts",
    response_model=(
        SpaceWeatherAlertListResponse
    ),
    summary="List space-weather alerts",
)
def list_space_weather_alerts(
    severity: AlertSeverity | None = None,
    type: AlertType | None = None,
    source: Literal[
        "NOAA_SWPC"
    ] | None = None,
    issued_start: datetime | None = None,
    issued_end: datetime | None = None,
    status: AlertStatus | None = None,
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    db: Session = Depends(get_db),
):
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
        SpaceWeatherAlertResponse
    ),
    summary="Get space-weather alert",
)
def space_weather_alert_detail(
    alert_id: int,
    db: Session = Depends(get_db),
):
    return get_space_weather_alert(
        db=db,
        alert_id=alert_id,
    )