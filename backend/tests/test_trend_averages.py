"""
Tests for hourly solar-wind averages and for the threshold lines served
with trends.

An hourly trend must cover every hour of its window, in order, leaving
an hour empty when nothing was stored in it. Joining the readings on
either side of a gap would make the chart claim data that does not
exist. The thresholds must be the values the risk engine applies.
"""

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.dialects import postgresql

from repositories.space_weather_repository import (
    list_hourly_averages,
)
from services import space_weather_service
from services.space_weather_risk_service import (
    G1_THRESHOLD,
    SOLAR_WIND_ELEVATED_DENSITY_PER_CM3,
    SOLAR_WIND_ELEVATED_SPEED_KM_S,
)
from services.space_weather_service import (
    get_kp_trend,
    get_solar_wind_trend,
)


def utc(
    day: int,
    hour: int,
    minute: int = 0,
) -> datetime:
    return datetime(
        2026,
        10,
        day,
        hour,
        minute,
        tzinfo=timezone.utc,
    )


class CapturingSession:
    """
    Records the statement it is asked to run and returns no rows.
    """

    def __init__(self):
        self.statement = None

    def execute(self, statement):
        self.statement = statement

        return EmptyResult()


class EmptyResult:
    def all(self):
        return []


def install_hourly_averages(
    monkeypatch,
    averages: dict[str, list[tuple[datetime, float, int]]],
) -> list[dict]:
    """
    Replace the repository query with fixed averages per metric, and
    record how it was called.
    """

    calls = []

    def fake_list_hourly_averages(
        db,
        source,
        metric_name,
        start,
        end,
    ):
        calls.append(
            {
                "metric_name": metric_name,
                "start": start,
                "end": end,
            }
        )

        return averages.get(metric_name, [])

    monkeypatch.setattr(
        space_weather_service,
        "list_hourly_averages",
        fake_list_hourly_averages,
    )

    return calls


# ---------------------------------------------------------------
# Repository query
# ---------------------------------------------------------------

def test_hours_are_cut_in_utc_and_averaged() -> None:
    db = CapturingSession()

    list_hourly_averages(
        db=db,
        source="NOAA_SWPC",
        metric_name="solar_wind_speed",
        start=utc(15, 0),
        end=utc(22, 0),
    )

    statement = db.statement.compile(
        dialect=postgresql.dialect(),
    )

    sql = str(statement)

    assert "date_trunc(" in sql
    assert "avg(" in sql
    assert "GROUP BY" in sql
    assert "numeric_value IS NOT NULL" in sql

    # The time zone is passed to date_trunc explicitly, so the
    # database session's own zone cannot shift the buckets.
    assert "UTC" in statement.params.values()
    assert "hour" in statement.params.values()


# ---------------------------------------------------------------
# Hourly trend
# ---------------------------------------------------------------

def test_every_hour_of_the_window_is_present(
    monkeypatch,
) -> None:
    calls = install_hourly_averages(
        monkeypatch,
        {
            "solar_wind_speed": [
                (utc(15, 1), 412.0, 60),
                (utc(15, 3), 455.5, 12),
            ],
            "solar_wind_density": [
                (utc(15, 1), 4.2, 60),
            ],
        },
    )

    response = get_solar_wind_trend(
        db=object(),
        start=utc(15, 0, 30),
        end=utc(15, 5, 10),
        interval="hour",
    )

    assert response.interval == "hour"
    assert response.count == 6

    assert [
        point.observed_at
        for point in response.points
    ] == [
        utc(15, hour)
        for hour in range(6)
    ]

    assert [
        point.speed_km_s
        for point in response.points
    ] == [
        None,
        412.0,
        None,
        455.5,
        None,
        None,
    ]

    assert response.points[1].density_per_cm3 == 4.2
    assert response.points[3].density_per_cm3 is None

    # An average can span several stations, so none is named.
    assert all(
        point.station is None
        for point in response.points
    )

    # The query starts at the top of the first hour, so that hour's
    # average covers the whole hour.
    assert calls[0]["start"] == utc(15, 0)
    assert calls[0]["end"] == utc(15, 5, 10)


def test_averages_are_rounded(
    monkeypatch,
) -> None:
    install_hourly_averages(
        monkeypatch,
        {
            "solar_wind_speed": [
                (utc(15, 0), 412.34567, 60),
            ],
        },
    )

    response = get_solar_wind_trend(
        db=object(),
        start=utc(15, 0),
        end=utc(15, 0, 59),
        interval="hour",
    )

    assert response.points[0].speed_km_s == 412.35


def test_hourly_trend_needs_a_start() -> None:
    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_solar_wind_trend(
            db=object(),
            interval="hour",
        )

    assert captured_error.value.status_code == 400


def test_hourly_trend_refuses_a_window_longer_than_the_limit() -> None:
    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_solar_wind_trend(
            db=object(),
            start=utc(1, 0),
            end=utc(15, 0),
            limit=168,
            interval="hour",
        )

    assert captured_error.value.status_code == 400

    assert "at most 168 hours" in (
        captured_error.value.detail
    )


def test_raw_readings_are_unchanged(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        space_weather_service,
        "list_measurements",
        lambda **kwargs: [],
    )

    response = get_solar_wind_trend(
        db=object(),
        start=utc(15, 0),
    )

    assert response.interval == "reading"
    assert response.count == 0


# ---------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------

def test_solar_wind_thresholds_are_the_risk_rules(
    monkeypatch,
) -> None:
    install_hourly_averages(
        monkeypatch,
        {},
    )

    response = get_solar_wind_trend(
        db=object(),
        start=utc(15, 0),
        end=utc(15, 1),
        interval="hour",
    )

    thresholds = {
        threshold.factor: threshold
        for threshold in response.thresholds
    }

    assert thresholds["solar_wind_speed"].value == (
        SOLAR_WIND_ELEVATED_SPEED_KM_S
    )

    assert thresholds["solar_wind_speed"].rule_id == (
        "SW_SPEED_ELEVATED"
    )

    assert thresholds["solar_wind_density"].value == (
        SOLAR_WIND_ELEVATED_DENSITY_PER_CM3
    )

    assert thresholds["solar_wind_density"].rule_id == (
        "SW_DENSITY_ELEVATED"
    )


def test_kp_trend_carries_the_g1_line(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        space_weather_service,
        "list_measurements",
        lambda **kwargs: [],
    )

    response = get_kp_trend(
        db=object(),
    )

    assert [
        (
            threshold.rule_id,
            threshold.value,
        )
        for threshold in response.thresholds
    ] == [
        (
            "KP_G1_G2",
            G1_THRESHOLD,
        ),
    ]
