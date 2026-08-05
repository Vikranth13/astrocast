from datetime import (
    datetime,
    timedelta,
    timezone,
)
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from services.space_weather_service import (
    calculate_freshness,
    format_age,
    get_current_space_weather,
    optional_integer,
)


@pytest.mark.parametrize(
    (
        "age_minutes",
        "expected_status",
    ),
    [
        (0, "current"),
        (240, "current"),
        (241, "delayed"),
        (720, "delayed"),
        (721, "stale"),
    ],
)
def test_calculates_freshness_boundaries(
    age_minutes: int,
    expected_status: str,
) -> None:
    now = datetime(
        2026,
        8,
        5,
        12,
        0,
        tzinfo=timezone.utc,
    )

    observed_at = now - timedelta(
        minutes=age_minutes
    )

    result = calculate_freshness(
        observed_at=observed_at,
        now=now,
    )

    assert result.age_minutes == age_minutes
    assert result.status == expected_status


def test_future_observation_does_not_create_negative_age(
) -> None:
    now = datetime(
        2026,
        8,
        5,
        12,
        0,
        tzinfo=timezone.utc,
    )

    observed_at = now + timedelta(
        minutes=10
    )

    result = calculate_freshness(
        observed_at=observed_at,
        now=now,
    )

    assert result.age_minutes == 0
    assert result.status == "current"


@pytest.mark.parametrize(
    (
        "age_minutes",
        "expected_text",
    ),
    [
        (30, "30 minutes"),
        (60, "1 hours"),
        (120, "2 hours"),
        (135, "2 hours and 15 minutes"),
    ],
)
def test_formats_age(
    age_minutes: int,
    expected_text: str,
) -> None:
    assert (
        format_age(age_minutes)
        == expected_text
    )


@pytest.mark.parametrize(
    (
        "value",
        "expected",
    ),
    [
        (8, 8),
        ("8", 8),
        (None, None),
        ("invalid", None),
    ],
)
def test_converts_optional_integer(
    value,
    expected,
) -> None:
    assert optional_integer(value) == expected


class FakeScalarResult:
    def __init__(
        self,
        measurement,
    ):
        self.measurement = measurement

    def first(self):
        return self.measurement


class FakeSession:
    def __init__(
        self,
        measurement,
    ):
        self.measurement = measurement

    def scalars(
        self,
        statement,
    ) -> FakeScalarResult:
        return FakeScalarResult(
            self.measurement
        )


def test_builds_current_space_weather_response(
) -> None:
    current_time = datetime.now(
        timezone.utc
    )

    measurement = SimpleNamespace(
        source="NOAA_SWPC",
        metric_name=(
            "planetary_k_index"
        ),
        observed_at=(
            current_time
            - timedelta(minutes=30)
        ),
        numeric_value=Decimal("1.67"),
        created_at=(
            current_time
            - timedelta(minutes=20)
        ),
        raw_payload={
            "Kp": 1.67,
            "a_running": 6,
            "station_count": 8,
        },
    )

    response = get_current_space_weather(
        FakeSession(measurement)
    )

    assert response.source == "NOAA_SWPC"

    assert (
        response.metric_name
        == "planetary_k_index"
    )

    assert response.facts.kp == 1.67
    assert response.facts.a_running == 6
    assert response.facts.station_count == 8

    assert (
        response.geomagnetic_activity.level
        == "below_storm"
    )

    assert (
        response.geomagnetic_activity.noaa_scale
        is None
    )

    assert response.freshness.status == "current"


def test_returns_404_when_no_measurement_exists(
) -> None:
    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_current_space_weather(
            FakeSession(None)
        )

    assert (
        captured_error.value.status_code
        == 404
    )

    assert (
        "Run NOAA ingestion first"
        in captured_error.value.detail
    )