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
    list_measurements,
)

from schemas.space_weather import (
    CurrentSpaceWeatherResponse,
    PlanetaryKpFacts,
    SpaceWeatherFreshness,
    SpaceWeatherAlertListResponse,
    SpaceWeatherAlertResponse,
    SpaceWeatherTrendPoint,
    SpaceWeatherTrendResponse,
    SolarWindTrendPoint,
    SolarWindTrendResponse,
    CurrentSpaceWeatherRiskResponse,
    SpaceWeatherRiskRawValues,
)
from services.space_weather_risk_service import (
    assess_space_weather_risk,
    classify_planetary_k_index,
)

from repositories.space_weather_alert_repository import (
    get_alert_by_id,
    list_alerts,
)


SOURCE_NAME = "NOAA_SWPC"
METRIC_NAME = "planetary_k_index"

CURRENT_MAX_AGE_MINUTES = 240
DELAYED_MAX_AGE_MINUTES = 720

SOLAR_WIND_SPEED_METRIC = (
    "solar_wind_speed"
)

SOLAR_WIND_DENSITY_METRIC = (
    "solar_wind_density"
)

SOLAR_WIND_TEMPERATURE_METRIC = (
    "solar_wind_temperature"
)


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

def calculate_alert_status(
    expires_at: datetime | None,
    now: datetime | None = None,
) -> str:
    if expires_at is None:
        return "unknown"

    current_time = ensure_utc(
        now or datetime.now(timezone.utc)
    )

    normalized_expiration = ensure_utc(
        expires_at
    )

    if normalized_expiration > current_time:
        return "active"

    return "expired"


def build_alert_response(
    alert,
    now: datetime | None = None,
) -> SpaceWeatherAlertResponse:
    return SpaceWeatherAlertResponse(
        id=alert.id,
        source=alert.source,
        external_id=alert.external_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        issued_at=ensure_utc(
            alert.issued_at
        ),
        expires_at=(
            ensure_utc(alert.expires_at)
            if alert.expires_at is not None
            else None
        ),
        status=calculate_alert_status(
            alert.expires_at,
            now=now,
        ),
        summary=alert.summary,
        ingested_at=ensure_utc(
            alert.created_at
        ),
    )


def get_space_weather_alerts(
    db: Session,
    severity: str | None = None,
    alert_type: str | None = None,
    source: str | None = None,
    issued_start: datetime | None = None,
    issued_end: datetime | None = None,
    status: str | None = None,
    limit: int = 100,
) -> SpaceWeatherAlertListResponse:

    if (
        issued_start is not None
        and issued_end is not None
        and issued_start > issued_end
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "issued_start must be earlier "
                "than or equal to issued_end."
            ),
        )
    
    current_time = datetime.now(
        timezone.utc
    )

    alerts = list_alerts(
        db=db,
        severity=severity,
        alert_type=alert_type,
        source=source,
        issued_start=issued_start,
        issued_end=issued_end,
        status=status,
        now=current_time,
        limit=limit,
    )

    responses = [
        build_alert_response(
            alert,
            now=current_time,
        )
        for alert in alerts
    ]

    return SpaceWeatherAlertListResponse(
        count=len(responses),
        alerts=responses,
    )


def get_space_weather_alert(
    db: Session,
    alert_id: int,
) -> SpaceWeatherAlertResponse:
    alert = get_alert_by_id(
        db,
        alert_id,
    )

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Space-weather alert was "
                "not found."
            ),
        )

    return build_alert_response(
        alert
    )

def get_kp_trend(
    db: Session,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 500,
) -> SpaceWeatherTrendResponse:
    if (
        start is not None
        and end is not None
        and start > end
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "start must be earlier than "
                "or equal to end."
            ),
        )

    measurements = list_measurements(
        db=db,
        source=SOURCE_NAME,
        metric_name=METRIC_NAME,
        start=start,
        end=end,
        limit=limit,
    )

    points = []

    for measurement in measurements:
        if measurement.numeric_value is None:
            continue

        points.append(
            SpaceWeatherTrendPoint(
                observed_at=ensure_utc(
                    measurement.observed_at
                ),
                value=float(
                    measurement.numeric_value
                ),
            )
        )

    unit = None

    if measurements:
        unit = measurements[0].unit

    return SpaceWeatherTrendResponse(
        source=SOURCE_NAME,
        metric_name=METRIC_NAME,
        unit=unit,
        count=len(points),
        points=points,
    )

def get_solar_wind_trend(
    db: Session,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 500,
) -> SolarWindTrendResponse:
    if (
        start is not None
        and end is not None
        and start > end
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "start must be earlier than "
                "or equal to end."
            ),
        )

    speed_measurements = list_measurements(
        db=db,
        source=SOURCE_NAME,
        metric_name=(
            SOLAR_WIND_SPEED_METRIC
        ),
        start=start,
        end=end,
        limit=limit,
    )

    density_measurements = list_measurements(
        db=db,
        source=SOURCE_NAME,
        metric_name=(
            SOLAR_WIND_DENSITY_METRIC
        ),
        start=start,
        end=end,
        limit=limit,
    )

    temperature_measurements = (
        list_measurements(
            db=db,
            source=SOURCE_NAME,
            metric_name=(
                SOLAR_WIND_TEMPERATURE_METRIC
            ),
            start=start,
            end=end,
            limit=limit,
        )
    )

    grouped: dict[
        tuple[datetime, str | None],
        dict,
    ] = {}

    def get_group(
        measurement,
    ) -> dict:
        observed_at = ensure_utc(
            measurement.observed_at
        )

        key = (
            observed_at,
            measurement.station,
        )

        if key not in grouped:
            grouped[key] = {
                "observed_at": observed_at,
                "station": measurement.station,
                "speed_km_s": None,
                "density_per_cm3": None,
                "temperature_k": None,
            }

        return grouped[key]

    for measurement in speed_measurements:
        if measurement.numeric_value is None:
            continue

        group = get_group(
            measurement
        )

        group["speed_km_s"] = float(
            measurement.numeric_value
        )

    for measurement in density_measurements:
        if measurement.numeric_value is None:
            continue

        group = get_group(
            measurement
        )

        group["density_per_cm3"] = float(
            measurement.numeric_value
        )

    for measurement in (
        temperature_measurements
    ):
        if measurement.numeric_value is None:
            continue

        group = get_group(
            measurement
        )

        group["temperature_k"] = float(
            measurement.numeric_value
        )

    ordered_values = sorted(
        grouped.values(),
        key=lambda item: item[
            "observed_at"
        ],
    )

    if len(ordered_values) > limit:
        ordered_values = (
            ordered_values[-limit:]
        )

    points = [
        SolarWindTrendPoint(
            **item
        )
        for item in ordered_values
    ]

    return SolarWindTrendResponse(
        source=SOURCE_NAME,
        count=len(points),
        points=points,
    )

def get_current_space_weather_risk(
    db: Session,
) -> CurrentSpaceWeatherRiskResponse:
    """
    Build the current deterministic AstroCast
    space-weather risk assessment from the latest
    stored measurements.

    Kp is required.

    Solar-wind speed and density are optional
    supporting measurements.
    """

    kp_measurement = get_latest_measurement(
        db=db,
        source=SOURCE_NAME,
        metric_name=METRIC_NAME,
    )

    if kp_measurement is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No stored planetary K-index "
                "measurement is available. "
                "Run NOAA ingestion first."
            ),
        )

    if kp_measurement.numeric_value is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Stored planetary K-index "
                "measurement has no numeric value."
            ),
        )

    speed_measurement = (
        get_latest_measurement(
            db=db,
            source=SOURCE_NAME,
            metric_name=(
                SOLAR_WIND_SPEED_METRIC
            ),
        )
    )

    density_measurement = (
        get_latest_measurement(
            db=db,
            source=SOURCE_NAME,
            metric_name=(
                SOLAR_WIND_DENSITY_METRIC
            ),
        )
    )

    speed = None
    speed_observed_at = None

    if (
        speed_measurement is not None
        and speed_measurement.numeric_value
        is not None
    ):
        speed = float(
            speed_measurement.numeric_value
        )

        speed_observed_at = ensure_utc(
            speed_measurement.observed_at
        )

    density = None
    density_observed_at = None

    if (
        density_measurement is not None
        and density_measurement.numeric_value
        is not None
    ):
        density = float(
            density_measurement.numeric_value
        )

        density_observed_at = ensure_utc(
            density_measurement.observed_at
        )

    station = None

    if speed_measurement is not None:
        station = speed_measurement.station

    elif density_measurement is not None:
        station = density_measurement.station

    risk = assess_space_weather_risk(
        kp=kp_measurement.numeric_value,
        solar_wind_speed_km_s=speed,
        solar_wind_density_per_cm3=density,
    )

    return CurrentSpaceWeatherRiskResponse(
        source=SOURCE_NAME,
        assessed_at=datetime.now(
            timezone.utc
        ),
        raw_values=(
            SpaceWeatherRiskRawValues(
                kp=float(
                    kp_measurement.numeric_value
                ),
                kp_observed_at=ensure_utc(
                    kp_measurement.observed_at
                ),
                solar_wind_speed_km_s=(
                    speed
                ),
                solar_wind_speed_observed_at=(
                    speed_observed_at
                ),
                solar_wind_density_per_cm3=(
                    density
                ),
                solar_wind_density_observed_at=(
                    density_observed_at
                ),
                solar_wind_station=station,
            )
        ),
        risk=risk,
    )