from datetime import datetime, timezone
from hashlib import sha256
from typing import Any

from pydantic import ValidationError

from schemas.noaa_kp import (
    NoaaPlanetaryKIndexSourceRecord,
)
from schemas.normalized_measurement import (
    NormalizedSpaceWeatherMeasurement,
)


SOURCE_NAME = "NOAA_SWPC"
METRIC_NAME = "planetary_k_index"
METRIC_UNIT = "index"


class NoaaKpParseError(ValueError):
    """
    Raised when a NOAA Kp source record cannot
    be validated or normalized.
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


def build_deduplication_key(
    observed_at: datetime,
) -> str:
    """
    Create a deterministic key for one logical
    NOAA planetary K-index observation.
    """

    normalized_timestamp = ensure_utc(
        observed_at
    ).isoformat(
        timespec="seconds"
    )

    canonical_value = (
        f"{SOURCE_NAME}|"
        f"{METRIC_NAME}|"
        f"{normalized_timestamp}"
    )

    return sha256(
        canonical_value.encode("utf-8")
    ).hexdigest()


def parse_noaa_planetary_k_index_record(
    raw_record: dict[str, Any],
) -> NormalizedSpaceWeatherMeasurement:
    """
    Validate and normalize one NOAA source record.
    """

    source_record = (
        NoaaPlanetaryKIndexSourceRecord
        .model_validate(raw_record)
    )

    return NormalizedSpaceWeatherMeasurement(
        source=SOURCE_NAME,
        deduplication_key=(
            build_deduplication_key(
                source_record.time_tag
            )
        ),
        metric_name=METRIC_NAME,
        observed_at=source_record.time_tag,
        numeric_value=source_record.kp,
        text_value=None,
        unit=METRIC_UNIT,
        station=None,
        raw_payload=dict(raw_record),
    )


def parse_noaa_planetary_k_index(
    payload: list[dict[str, Any]],
) -> list[NormalizedSpaceWeatherMeasurement]:
    """
    Validate and normalize a complete NOAA response.
    """

    normalized_records: list[
        NormalizedSpaceWeatherMeasurement
    ] = []

    for index, raw_record in enumerate(payload):
        try:
            normalized_record = (
                parse_noaa_planetary_k_index_record(
                    raw_record
                )
            )

        except ValidationError as error:
            raise NoaaKpParseError(
                (
                    "NOAA planetary K-index "
                    f"record {index} failed "
                    f"validation: {error}"
                )
            ) from error

        normalized_records.append(
            normalized_record
        )

    return normalized_records