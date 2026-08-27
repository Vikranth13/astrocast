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
    calculate_alert_status,
    calculate_freshness,
    format_age,
    get_current_space_weather,
    get_space_weather_alert,
    get_space_weather_alerts,
    optional_integer,
    get_kp_trend,
    get_solar_wind_trend,
    get_current_space_weather_risk,
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

def test_alert_without_expiration_has_unknown_status() -> None:
    assert (
        calculate_alert_status(None)
        == "unknown"
    )

def test_future_alert_is_active() -> None:
    now = datetime(
        2026,
        8,
        24,
        12,
        0,
        tzinfo=timezone.utc,
    )

    expires_at = datetime(
        2026,
        8,
        24,
        18,
        0,
        tzinfo=timezone.utc,
    )

    assert (
        calculate_alert_status(
            expires_at,
            now=now,
        )
        == "active"
    )

def test_past_alert_is_expired() -> None:
    now = datetime(
        2026,
        8,
        24,
        12,
        0,
        tzinfo=timezone.utc,
    )

    expires_at = datetime(
        2026,
        8,
        24,
        6,
        0,
        tzinfo=timezone.utc,
    )

    assert (
        calculate_alert_status(
            expires_at,
            now=now,
        )
        == "expired"
    )

def test_alert_list_rejects_reversed_date_range() -> None:
    issued_start = datetime(
        2026,
        8,
        24,
        tzinfo=timezone.utc,
    )

    issued_end = datetime(
        2026,
        8,
        20,
        tzinfo=timezone.utc,
    )

    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_space_weather_alerts(
            db=object(),
            issued_start=issued_start,
            issued_end=issued_end,
        )

    assert (
        captured_error.value.status_code
        == 400
    )

    assert (
        captured_error.value.detail
        == (
            "issued_start must be earlier "
            "than or equal to issued_end."
        )
    )

def test_returns_404_when_alert_does_not_exist(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        "services.space_weather_service.get_alert_by_id",
        lambda db, alert_id: None,
    )

    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_space_weather_alert(
            db=object(),
            alert_id=999999,
        )

    assert (
        captured_error.value.status_code
        == 404
    )

    assert (
        captured_error.value.detail
        == (
            "Space-weather alert was "
            "not found."
        )
    )

def test_builds_kp_trend(
    monkeypatch,
) -> None:
    measurements = [
        SimpleNamespace(
            observed_at=datetime(
                2026,
                8,
                1,
                0,
                0,
                tzinfo=timezone.utc,
            ),
            numeric_value=Decimal("1.33"),
            unit=None,
        ),
        SimpleNamespace(
            observed_at=datetime(
                2026,
                8,
                1,
                3,
                0,
                tzinfo=timezone.utc,
            ),
            numeric_value=Decimal("1.67"),
            unit=None,
        ),
    ]

    monkeypatch.setattr(
        (
            "services.space_weather_service."
            "list_measurements"
        ),
        lambda **kwargs: measurements,
    )

    result = get_kp_trend(
        db=object()
    )

    assert result.source == "NOAA_SWPC"

    assert (
        result.metric_name
        == "planetary_k_index"
    )

    assert result.count == 2

    assert result.points[0].value == 1.33

    assert result.points[1].value == 1.67

def test_kp_trend_can_be_empty(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        (
            "services.space_weather_service."
            "list_measurements"
        ),
        lambda **kwargs: [],
    )

    result = get_kp_trend(
        db=object()
    )

    assert result.count == 0

    assert result.points == []

def test_kp_trend_rejects_reversed_range(
) -> None:
    start = datetime(
        2026,
        8,
        25,
        tzinfo=timezone.utc,
    )

    end = datetime(
        2026,
        8,
        1,
        tzinfo=timezone.utc,
    )

    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_kp_trend(
            db=object(),
            start=start,
            end=end,
        )

    assert (
        captured_error.value.status_code
        == 400
    )

def test_builds_solar_wind_trend(
    monkeypatch,
) -> None:
    observed_at = datetime(
        2026,
        8,
        26,
        0,
        39,
        tzinfo=timezone.utc,
    )

    speed = SimpleNamespace(
        observed_at=observed_at,
        numeric_value=Decimal(
            "326.42"
        ),
        station="SOLAR1",
    )

    density = SimpleNamespace(
        observed_at=observed_at,
        numeric_value=Decimal(
            "3.8"
        ),
        station="SOLAR1",
    )

    temperature = SimpleNamespace(
        observed_at=observed_at,
        numeric_value=Decimal(
            "33643"
        ),
        station="SOLAR1",
    )

    def fake_list_measurements(
        **kwargs,
    ):
        metric_name = kwargs[
            "metric_name"
        ]

        if (
            metric_name
            == "solar_wind_speed"
        ):
            return [speed]

        if (
            metric_name
            == "solar_wind_density"
        ):
            return [density]

        if (
            metric_name
            == "solar_wind_temperature"
        ):
            return [temperature]

        return []

    monkeypatch.setattr(
        (
            "services.space_weather_service."
            "list_measurements"
        ),
        fake_list_measurements,
    )

    result = get_solar_wind_trend(
        db=object()
    )

    assert result.count == 1

    point = result.points[0]

    assert point.station == "SOLAR1"

    assert point.speed_km_s == 326.42

    assert (
        point.density_per_cm3
        == 3.8
    )

    assert (
        point.temperature_k
        == 33643
    )

def test_solar_wind_trend_allows_missing_metrics(
    monkeypatch,
) -> None:
    observed_at = datetime(
        2026,
        8,
        26,
        tzinfo=timezone.utc,
    )

    speed = SimpleNamespace(
        observed_at=observed_at,
        numeric_value=Decimal(
            "400"
        ),
        station="SOLAR1",
    )

    def fake_list_measurements(
        **kwargs,
    ):
        if (
            kwargs["metric_name"]
            == "solar_wind_speed"
        ):
            return [speed]

        return []

    monkeypatch.setattr(
        (
            "services.space_weather_service."
            "list_measurements"
        ),
        fake_list_measurements,
    )

    result = get_solar_wind_trend(
        db=object()
    )

    assert result.count == 1

    assert (
        result.points[0].speed_km_s
        == 400
    )

    assert (
        result.points[0]
        .density_per_cm3
        is None
    )

    assert (
        result.points[0]
        .temperature_k
        is None
    )

def test_solar_wind_trend_rejects_reversed_range(
) -> None:
    start = datetime(
        2026,
        8,
        26,
        tzinfo=timezone.utc,
    )

    end = datetime(
        2026,
        8,
        20,
        tzinfo=timezone.utc,
    )

    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_solar_wind_trend(
            db=object(),
            start=start,
            end=end,
        )

    assert (
        captured_error.value.status_code
        == 400
    )

def test_builds_current_space_weather_risk(
    monkeypatch,
) -> None:
    kp_time = datetime(
        2026,
        8,
        26,
        0,
        0,
        tzinfo=timezone.utc,
    )

    solar_time = datetime(
        2026,
        8,
        26,
        1,
        0,
        tzinfo=timezone.utc,
    )

    kp_measurement = SimpleNamespace(
        metric_name=(
            "planetary_k_index"
        ),
        numeric_value=Decimal(
            "5.0"
        ),
        observed_at=kp_time,
        station=None,
    )

    speed_measurement = SimpleNamespace(
        metric_name=(
            "solar_wind_speed"
        ),
        numeric_value=Decimal(
            "550"
        ),
        observed_at=solar_time,
        station="SOLAR1",
    )

    density_measurement = SimpleNamespace(
        metric_name=(
            "solar_wind_density"
        ),
        numeric_value=Decimal(
            "12"
        ),
        observed_at=solar_time,
        station="SOLAR1",
    )

    def fake_get_latest_measurement(
        *,
        db,
        source,
        metric_name,
    ):
        if (
            metric_name
            == "planetary_k_index"
        ):
            return kp_measurement

        if (
            metric_name
            == "solar_wind_speed"
        ):
            return speed_measurement

        if (
            metric_name
            == "solar_wind_density"
        ):
            return density_measurement

        return None

    monkeypatch.setattr(
        (
            "services.space_weather_service."
            "get_latest_measurement"
        ),
        fake_get_latest_measurement,
    )

    result = (
        get_current_space_weather_risk(
            db=object()
        )
    )

    assert result.raw_values.kp == 5.0

    assert (
        result.raw_values
        .solar_wind_speed_km_s
        == 550.0
    )

    assert (
        result.raw_values
        .solar_wind_density_per_cm3
        == 12.0
    )

    assert (
        result.raw_values
        .solar_wind_station
        == "SOLAR1"
    )

    assert result.risk.level == "high"

    assert (
        "KP_G1_G2"
        in result.risk.rule_ids
    )

    assert (
        "SW_FAST_DENSE_ESCALATION"
        in result.risk.rule_ids
    )

def test_current_risk_allows_missing_solar_wind(
    monkeypatch,
) -> None:
    kp_measurement = SimpleNamespace(
        numeric_value=Decimal(
            "5.0"
        ),
        observed_at=datetime(
            2026,
            8,
            26,
            tzinfo=timezone.utc,
        ),
        station=None,
    )

    def fake_get_latest_measurement(
        *,
        db,
        source,
        metric_name,
    ):
        if (
            metric_name
            == "planetary_k_index"
        ):
            return kp_measurement

        return None

    monkeypatch.setattr(
        (
            "services.space_weather_service."
            "get_latest_measurement"
        ),
        fake_get_latest_measurement,
    )

    result = (
        get_current_space_weather_risk(
            db=object()
        )
    )

    assert result.risk.level == "moderate"

    assert (
        result.raw_values
        .solar_wind_speed_km_s
        is None
    )

    assert (
        result.raw_values
        .solar_wind_density_per_cm3
        is None
    )

def test_current_risk_returns_404_without_kp(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        (
            "services.space_weather_service."
            "get_latest_measurement"
        ),
        lambda **kwargs: None,
    )

    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_current_space_weather_risk(
            db=object()
        )

    assert (
        captured_error.value.status_code
        == 404
    )