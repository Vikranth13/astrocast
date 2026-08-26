from datetime import datetime, timezone
from decimal import Decimal
from hashlib import sha256
from typing import Any

from pydantic import ValidationError

from schemas.noaa_solar_wind import (
    NoaaSolarWindRecord,
)
from schemas.normalized_measurement import (
    NormalizedSpaceWeatherMeasurement,
)


SOURCE_NAME = "NOAA_SWPC"

SPEED_METRIC_NAME = "solar_wind_speed"
SPEED_METRIC_UNIT = "km/s"

DENSITY_METRIC_NAME = "solar_wind_density"
DENSITY_METRIC_UNIT = "1/cm^3"

TEMPERATURE_METRIC_NAME = (
    "solar_wind_temperature"
)
TEMPERATURE_METRIC_UNIT = "K"


class NoaaSolarWindParseError(ValueError):
    """
    Raised when NOAA solar-wind source data
    cannot be validated or normalized.
    """


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


def parse_time_tag(
    value: str,
) -> datetime:
    """
    Parse NOAA RTSW time_tag into UTC.
    """

    try:
        parsed = datetime.fromisoformat(
            value
        )

    except ValueError as error:
        raise NoaaSolarWindParseError(
            (
                "NOAA solar-wind time_tag "
                f"was invalid: {value}"
            )
        ) from error

    return ensure_utc(parsed)


def build_deduplication_key(
    spacecraft: str,
    metric_name: str,
    observed_at: datetime,
) -> str:
    """
    Create a deterministic key for one
    solar-wind metric observation.
    """

    normalized_timestamp = ensure_utc(
        observed_at
    ).isoformat(
        timespec="seconds"
    )

    canonical_value = (
        f"{SOURCE_NAME}|"
        f"{spacecraft}|"
        f"{metric_name}|"
        f"{normalized_timestamp}"
    )

    return sha256(
        canonical_value.encode("utf-8")
    ).hexdigest()


def build_measurement(
    *,
    spacecraft: str,
    metric_name: str,
    observed_at: datetime,
    numeric_value: float,
    unit: str,
    raw_payload: dict[str, Any],
) -> NormalizedSpaceWeatherMeasurement:
    """
    Build one normalized AstroCast measurement.
    """

    return NormalizedSpaceWeatherMeasurement(
        source=SOURCE_NAME,
        deduplication_key=(
            build_deduplication_key(
                spacecraft=spacecraft,
                metric_name=metric_name,
                observed_at=observed_at,
            )
        ),
        metric_name=metric_name,
        observed_at=observed_at,
        numeric_value=Decimal(
            str(numeric_value)
        ),
        text_value=None,
        unit=unit,
        station=spacecraft,
        raw_payload=dict(raw_payload),
    )


def parse_noaa_solar_wind_record(
    raw_record: dict[str, Any],
) -> list[
    NormalizedSpaceWeatherMeasurement
]:
    """
    Validate and normalize one NOAA RTSW
    solar-wind record.

    Inactive spacecraft records are ignored.
    One active NOAA source record can produce
    up to three AstroCast measurements.
    """

    source_record = (
        NoaaSolarWindRecord.model_validate(
            raw_record
        )
    )

    if not source_record.active:
        return []

    observed_at = parse_time_tag(
        source_record.time_tag
    )

    normalized_records: list[
        NormalizedSpaceWeatherMeasurement
    ] = []

    if source_record.proton_speed is not None:
        normalized_records.append(
            build_measurement(
                spacecraft=source_record.source,
                metric_name=(
                    SPEED_METRIC_NAME
                ),
                observed_at=observed_at,
                numeric_value=(
                    source_record.proton_speed
                ),
                unit=SPEED_METRIC_UNIT,
                raw_payload=raw_record,
            )
        )

    if (
        source_record.proton_density
        is not None
    ):
        normalized_records.append(
            build_measurement(
                spacecraft=source_record.source,
                metric_name=(
                    DENSITY_METRIC_NAME
                ),
                observed_at=observed_at,
                numeric_value=(
                    source_record.proton_density
                ),
                unit=DENSITY_METRIC_UNIT,
                raw_payload=raw_record,
            )
        )

    if (
        source_record.proton_temperature
        is not None
    ):
        normalized_records.append(
            build_measurement(
                spacecraft=source_record.source,
                metric_name=(
                    TEMPERATURE_METRIC_NAME
                ),
                observed_at=observed_at,
                numeric_value=(
                    source_record.proton_temperature
                ),
                unit=TEMPERATURE_METRIC_UNIT,
                raw_payload=raw_record,
            )
        )

    return normalized_records


def parse_noaa_solar_wind(
    payload: list[dict[str, Any]],
) -> list[
    NormalizedSpaceWeatherMeasurement
]:
    """
    Validate and normalize a complete NOAA
    RTSW solar-wind response.
    """

    normalized_records: list[
        NormalizedSpaceWeatherMeasurement
    ] = []

    for index, raw_record in enumerate(
        payload
    ):
        try:
            record_measurements = (
                parse_noaa_solar_wind_record(
                    raw_record
                )
            )

        except ValidationError as error:
            raise NoaaSolarWindParseError(
                (
                    "NOAA solar-wind record "
                    f"{index} failed "
                    f"validation: {error}"
                )
            ) from error

        normalized_records.extend(
            record_measurements
        )

    return normalized_records