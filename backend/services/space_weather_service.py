from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
# from sqlalchemy import select
from sqlalchemy.orm import Session

# from models.space_weather_measurement import (
#     SpaceWeatherMeasurement,
# )

from repositories.space_weather_repository import (
    get_latest_measurement,
)

from schemas.space_weather import (
    CurrentSpaceWeatherResponse,
    PlanetaryKpFacts,
    SpaceWeatherFreshness,
)
from services.space_weather_risk_service import (
    classify_planetary_k_index,
)


SOURCE_NAME = "NOAA_SWPC"
METRIC_NAME = "planetary_k_index"

CURRENT_MAX_AGE_MINUTES = 240
DELAYED_MAX_AGE_MINUTES = 720


def ensure_utc(
    value: datetime,
) -> datetime:
    """
    Return a timezone-aware UTC datetime.
    """

    if value.tzinfo is None:
        return value.replace(
            tzinfo=timezone.utc,
        )

    return value.astimezone(
        timezone.utc,
    )


def calculate_freshness(
    observed_at: datetime,
    now: datetime | None = None,
) -> SpaceWeatherFreshness:
    """
    Calculate how old the source observation is.

    AstroCast policy:
    - current: up to 4 hours old
    - delayed: more than 4 through 12 hours old
    - stale: more than 12 hours old
    """

    normalized_observed_at = ensure_utc(
        observed_at
    )

    current_time = ensure_utc(
        now or datetime.now(timezone.utc)
    )

    age_seconds = (
        current_time
        - normalized_observed_at
    ).total_seconds()

    age_minutes = max(
        0,
        int(age_seconds // 60),
    )

    if age_minutes <= CURRENT_MAX_AGE_MINUTES:
        status = "current"

    elif age_minutes <= DELAYED_MAX_AGE_MINUTES:
        status = "delayed"

    else:
        status = "stale"

    return SpaceWeatherFreshness(
        status=status,
        age_minutes=age_minutes,
    )


def optional_integer(
    value: Any,
) -> int | None:
    """
    Convert an optional raw-payload value to int.
    """

    if value is None:
        return None

    try:
        return int(value)

    except (TypeError, ValueError):
        return None


def format_age(
    age_minutes: int,
) -> str:
    """
    Convert a minute count into readable text.
    """

    if age_minutes < 60:
        return f"{age_minutes} minutes"

    hours = age_minutes // 60
    remaining_minutes = age_minutes % 60

    if remaining_minutes == 0:
        return f"{hours} hours"

    return (
        f"{hours} hours and "
        f"{remaining_minutes} minutes"
    )


def get_current_space_weather(
    db: Session,
) -> CurrentSpaceWeatherResponse:
    """
    Return the newest stored NOAA planetary
    K-index measurement.
    """

    measurement = get_latest_measurement(
    db=db,
    source=SOURCE_NAME,
    metric_name=METRIC_NAME,
    )

    if measurement is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No NOAA space-weather data is "
                "available. Run NOAA ingestion first."
            ),
        )

    if measurement.numeric_value is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "The latest planetary K-index "
                "record has no numeric value."
            ),
        )

    kp = float(
        measurement.numeric_value
    )

    geomagnetic_activity = (
        classify_planetary_k_index(kp)
    )

    freshness = calculate_freshness(
        measurement.observed_at
    )

    raw_payload = (
        measurement.raw_payload
        if isinstance(
            measurement.raw_payload,
            dict,
        )
        else {}
    )

    facts = PlanetaryKpFacts(
        kp=kp,
        a_running=optional_integer(
            raw_payload.get("a_running")
        ),
        station_count=optional_integer(
            raw_payload.get("station_count")
        ),
    )

    if geomagnetic_activity.noaa_scale is None:
        activity_sentence = (
            "This is below NOAA geomagnetic "
            "storm level."
        )

    else:
        activity_sentence = (
            "This meets NOAA "
            f"{geomagnetic_activity.noaa_scale} "
            f"({geomagnetic_activity.label}) level."
        )

    readable_age = format_age(
        freshness.age_minutes
    )

    explanation = (
        "The latest observed planetary "
        f"K-index is {kp:.2f}. "
        f"{activity_sentence} "
        "The observation is approximately "
        f"{readable_age} old and AstroCast "
        f"classifies the source data as "
        f"{freshness.status}."
    )

    return CurrentSpaceWeatherResponse(
        source=SOURCE_NAME,
        metric_name=METRIC_NAME,
        observed_at=ensure_utc(
            measurement.observed_at
        ),
        ingested_at=ensure_utc(
            measurement.created_at
        ),
        freshness=freshness,
        geomagnetic_activity=(
            geomagnetic_activity
        ),
        facts=facts,
        explanation=explanation,
    )