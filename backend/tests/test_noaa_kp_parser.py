from datetime import (
    datetime,
    timedelta,
    timezone,
)
from decimal import Decimal

import pytest

from parsers.noaa_kp_parser import (
    NoaaKpParseError,
    build_deduplication_key,
    parse_noaa_planetary_k_index,
    parse_noaa_planetary_k_index_record,
)


SAMPLE_RECORD = {
    "time_tag": "2026-08-03T15:00:00",
    "Kp": 1.67,
    "a_running": 6,
    "station_count": 8,
}


def test_normalizes_valid_noaa_record() -> None:
    result = (
        parse_noaa_planetary_k_index_record(
            SAMPLE_RECORD
        )
    )

    assert result.source == "NOAA_SWPC"

    assert (
        result.metric_name
        == "planetary_k_index"
    )

    assert result.numeric_value == Decimal(
        "1.67"
    )

    assert result.unit == "index"

    assert result.text_value is None

    assert result.station is None

    assert (
        result.observed_at.utcoffset()
        == timedelta(0)
    )

    assert result.raw_payload == SAMPLE_RECORD

    assert len(result.deduplication_key) == 64


def test_batch_parser_preserves_record_count() -> None:
    payload = [
        SAMPLE_RECORD,
        {
            "time_tag": "2026-08-03T18:00:00",
            "Kp": 2.0,
            "a_running": 7,
            "station_count": 8,
        },
    ]

    results = parse_noaa_planetary_k_index(
        payload
    )

    assert len(results) == 2


def test_same_observation_produces_same_key() -> None:
    timestamp = datetime(
        2026,
        8,
        3,
        15,
        0,
        tzinfo=timezone.utc,
    )

    first_key = build_deduplication_key(
        timestamp
    )

    second_key = build_deduplication_key(
        timestamp
    )

    assert first_key == second_key


def test_different_observations_produce_different_keys(
) -> None:
    first_timestamp = datetime(
        2026,
        8,
        3,
        15,
        0,
        tzinfo=timezone.utc,
    )

    second_timestamp = datetime(
        2026,
        8,
        3,
        18,
        0,
        tzinfo=timezone.utc,
    )

    first_key = build_deduplication_key(
        first_timestamp
    )

    second_key = build_deduplication_key(
        second_timestamp
    )

    assert first_key != second_key


def test_batch_parser_rejects_invalid_kp() -> None:
    invalid_record = {
        "time_tag": "2026-08-03T15:00:00",
        "Kp": 12.0,
        "a_running": 6,
        "station_count": 8,
    }

    with pytest.raises(
        NoaaKpParseError,
        match="failed validation",
    ):
        parse_noaa_planetary_k_index(
            [invalid_record]
        )


def test_batch_parser_rejects_missing_field() -> None:
    missing_station_count = {
        "time_tag": "2026-08-03T15:00:00",
        "Kp": 1.67,
        "a_running": 6,
    }

    with pytest.raises(NoaaKpParseError):
        parse_noaa_planetary_k_index(
            [missing_station_count]
        )