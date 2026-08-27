import pytest

from services.space_weather_risk_service import (
    assess_space_weather_risk,
    classify_planetary_k_index,
)


@pytest.mark.parametrize(
    (
        "kp",
        "expected_level",
        "expected_scale",
        "expected_is_storm",
    ),
    [
        (0.0, "below_storm", None, False),
        (2.0, "below_storm", None, False),
        (4.66, "below_storm", None, False),
        (4.67, "minor", "G1", True),
        (5.67, "moderate", "G2", True),
        (6.67, "strong", "G3", True),
        (7.67, "severe", "G4", True),
        (8.67, "severe", "G4", True),
        (9.0, "extreme", "G5", True),
    ],
)
def test_classifies_planetary_k_index(
    kp: float,
    expected_level: str,
    expected_scale: str | None,
    expected_is_storm: bool,
) -> None:
    result = classify_planetary_k_index(kp)

    assert result.level == expected_level
    assert result.noaa_scale == expected_scale
    assert result.is_storm is expected_is_storm


@pytest.mark.parametrize(
    "invalid_kp",
    [
        -0.01,
        9.01,
        12.0,
    ],
)
def test_rejects_kp_outside_valid_range(
    invalid_kp: float,
) -> None:
    with pytest.raises(
        ValueError,
        match="between 0 and 9",
    ):
        classify_planetary_k_index(
            invalid_kp
        )

@pytest.mark.parametrize(
    (
        "kp",
        "expected_level",
    ),
    [
        (0.0, "low"),
        (4.66, "low"),
        (4.67, "moderate"),
        (5.67, "moderate"),
        (6.66, "moderate"),
        (6.67, "high"),
        (7.66, "high"),
        (7.67, "severe"),
        (9.0, "severe"),
    ],
)
def test_assesses_kp_risk_boundaries(
    kp: float,
    expected_level: str,
) -> None:
    result = assess_space_weather_risk(
        kp
    )

    assert result.level == expected_level

def test_elevated_solar_wind_speed_alone_does_not_escalate(
) -> None:
    result = assess_space_weather_risk(
        kp=2.0,
        solar_wind_speed_km_s=500.0,
        solar_wind_density_per_cm3=5.0,
    )

    assert result.level == "low"

    assert (
        "SW_SPEED_ELEVATED"
        in result.rule_ids
    )

    assert (
        "SW_FAST_DENSE_ESCALATION"
        not in result.rule_ids
    )

def test_elevated_solar_wind_density_alone_does_not_escalate(
) -> None:
    result = assess_space_weather_risk(
        kp=2.0,
        solar_wind_speed_km_s=400.0,
        solar_wind_density_per_cm3=10.0,
    )

    assert result.level == "low"

    assert (
        "SW_DENSITY_ELEVATED"
        in result.rule_ids
    )

    assert (
        "SW_FAST_DENSE_ESCALATION"
        not in result.rule_ids
    )

def test_fast_dense_solar_wind_escalates_low_to_moderate(
) -> None:
    result = assess_space_weather_risk(
        kp=2.0,
        solar_wind_speed_km_s=500.0,
        solar_wind_density_per_cm3=10.0,
    )

    assert result.level == "moderate"

    assert (
        "SW_FAST_DENSE_ESCALATION"
        in result.rule_ids
    )

def test_fast_dense_solar_wind_escalates_moderate_to_high(
) -> None:
    result = assess_space_weather_risk(
        kp=5.0,
        solar_wind_speed_km_s=500.0,
        solar_wind_density_per_cm3=10.0,
    )

    assert result.level == "high"

def test_solar_wind_does_not_escalate_high_to_severe(
) -> None:
    result = assess_space_weather_risk(
        kp=7.0,
        solar_wind_speed_km_s=900.0,
        solar_wind_density_per_cm3=30.0,
    )

    assert result.level == "high"

def test_g4_or_g5_remains_severe(
) -> None:
    result = assess_space_weather_risk(
        kp=8.0,
        solar_wind_speed_km_s=900.0,
        solar_wind_density_per_cm3=30.0,
    )

    assert result.level == "severe"

def test_risk_allows_missing_solar_wind(
) -> None:
    result = assess_space_weather_risk(
        kp=5.0,
    )

    assert result.level == "moderate"

    assert (
        "SW_SPEED_ELEVATED"
        not in result.rule_ids
    )

    assert (
        "SW_DENSITY_ELEVATED"
        not in result.rule_ids
    )

@pytest.mark.parametrize(
    (
        "speed",
        "density",
        "expected_message",
    ),
    [
        (
            -1.0,
            None,
            "Solar-wind speed",
        ),
        (
            None,
            -1.0,
            "Solar-wind density",
        ),
    ],
)
def test_rejects_negative_solar_wind_values(
    speed,
    density,
    expected_message,
) -> None:
    with pytest.raises(
        ValueError,
        match=expected_message,
    ):
        assess_space_weather_risk(
            kp=2.0,
            solar_wind_speed_km_s=speed,
            solar_wind_density_per_cm3=density,
        )