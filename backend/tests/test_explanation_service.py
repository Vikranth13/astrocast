"""
Tests for the deterministic explanation engine.

The engine must be reproducible and must never claim
more than the stored data supports, so these tests
focus on wording guarantees and caveats rather than
on exact prose.
"""

from datetime import datetime, timezone

import pytest

from schemas.space_weather import (
    SpaceWeatherFreshness,
    SpaceWeatherRiskAssessment,
    SpaceWeatherRiskFactor,
)
from services.explanation_service import (
    AURORA_LOCATION_CAVEAT,
    DELAYED_DATA_CAVEAT,
    MISSING_SOLAR_WIND_CAVEAT,
    STALE_DATA_CAVEAT,
    build_alert_explanation,
    build_current_explanation,
    build_risk_explanation,
    explain_alert,
    explain_aurora_implications,
    explain_kp,
    explain_solar_wind,
    explain_technology_impacts,
    format_age,
    freshness_caveat,
)
from services.space_weather_risk_service import (
    classify_planetary_k_index,
)


ISSUED_AT = datetime(
    2026,
    8,
    24,
    10,
    36,
    tzinfo=timezone.utc,
)

EXPIRES_AT = datetime(
    2026,
    8,
    24,
    18,
    0,
    tzinfo=timezone.utc,
)


def freshness(
    status: str,
    age_minutes: int,
) -> SpaceWeatherFreshness:
    return SpaceWeatherFreshness(
        status=status,
        age_minutes=age_minutes,
    )


# -------------------------------------------------
# Kp
# -------------------------------------------------

def test_explain_kp_below_storm_names_the_threshold(
) -> None:
    activity = classify_planetary_k_index(1.67)

    result = explain_kp(1.67, activity)

    assert "1.67" in result
    assert "below the NOAA G1" in result


def test_explain_kp_reports_the_noaa_scale(
) -> None:
    activity = classify_planetary_k_index(7.0)

    result = explain_kp(7.0, activity)

    assert "7.00" in result
    assert "G3" in result


@pytest.mark.parametrize(
    "kp",
    [0.0, 1.67, 4.67, 5.67, 6.67, 7.67, 9.0],
)
def test_explain_kp_is_deterministic(
    kp: float,
) -> None:
    activity = classify_planetary_k_index(kp)

    assert (
        explain_kp(kp, activity)
        == explain_kp(kp, activity)
    )


# -------------------------------------------------
# Aurora
#
# The roadmap forbids implying local aurora
# visibility from Kp alone, so the caveat must be
# present at every activity level without exception.
# -------------------------------------------------

@pytest.mark.parametrize(
    "kp",
    [0.0, 1.67, 4.67, 5.67, 6.67, 7.67, 9.0],
)
def test_aurora_explanation_always_carries_caveat(
    kp: float,
) -> None:
    activity = classify_planetary_k_index(kp)

    result = explain_aurora_implications(
        activity
    )

    assert AURORA_LOCATION_CAVEAT in result


# -------------------------------------------------
# Solar wind
# -------------------------------------------------

def test_solar_wind_returns_none_without_data(
) -> None:
    assert (
        explain_solar_wind(
            speed_km_s=None,
            density_per_cm3=None,
        )
        is None
    )


def test_solar_wind_reports_speed_only(
) -> None:
    result = explain_solar_wind(
        speed_km_s=420.0,
        density_per_cm3=None,
    )

    assert result is not None
    assert "420 km/s" in result
    assert "within typical range" in result
    assert "density" not in result


def test_solar_wind_marks_elevated_values(
) -> None:
    result = explain_solar_wind(
        speed_km_s=650.0,
        density_per_cm3=14.2,
    )

    assert result is not None
    assert result.count("elevated") == 2
    assert "650 km/s" in result
    assert "14.2" in result


def test_solar_wind_threshold_is_inclusive(
) -> None:
    result = explain_solar_wind(
        speed_km_s=500.0,
        density_per_cm3=None,
    )

    assert result is not None
    assert "elevated" in result


# -------------------------------------------------
# Technology impacts and freshness
# -------------------------------------------------

def test_no_technology_impacts_below_storm(
) -> None:
    activity = classify_planetary_k_index(2.0)

    assert (
        explain_technology_impacts(activity)
        is None
    )


@pytest.mark.parametrize(
    "kp, expected_scale",
    [
        (4.67, "G1"),
        (5.67, "G2"),
        (6.67, "G3"),
        (7.67, "G4"),
        (9.0, "G5"),
    ],
)
def test_technology_impacts_exist_for_every_storm(
    kp: float,
    expected_scale: str,
) -> None:
    activity = classify_planetary_k_index(kp)

    assert activity.noaa_scale == expected_scale

    result = explain_technology_impacts(
        activity
    )

    assert result is not None
    assert len(result) > 0


def test_current_freshness_needs_no_caveat(
) -> None:
    assert (
        freshness_caveat(
            freshness("current", 30)
        )
        is None
    )


def test_delayed_and_stale_data_are_flagged(
) -> None:
    assert (
        freshness_caveat(
            freshness("delayed", 400)
        )
        == DELAYED_DATA_CAVEAT
    )

    assert (
        freshness_caveat(
            freshness("stale", 5000)
        )
        == STALE_DATA_CAVEAT
    )


@pytest.mark.parametrize(
    "age_minutes, expected",
    [
        (0, "0 minutes"),
        (59, "59 minutes"),
        (60, "1 hours"),
        (185, "3 hours and 5 minutes"),
    ],
)
def test_format_age(
    age_minutes: int,
    expected: str,
) -> None:
    assert format_age(age_minutes) == expected


# -------------------------------------------------
# Alerts
# -------------------------------------------------

def test_alert_names_type_severity_and_family(
) -> None:
    result = explain_alert(
        alert_type="warning",
        severity="G3",
        status="active",
        issued_at=ISSUED_AT,
        expires_at=EXPIRES_AT,
    )

    assert "warning" in result
    assert "G3" in result
    assert "geomagnetic storm" in result
    assert "2026-08-24 10:36 UTC" in result
    assert "2026-08-24 18:00 UTC" in result


def test_radio_and_radiation_families_are_named(
) -> None:
    radio = explain_alert(
        alert_type="alert",
        severity="R2",
        status="expired",
        issued_at=ISSUED_AT,
        expires_at=EXPIRES_AT,
    )

    radiation = explain_alert(
        alert_type="alert",
        severity="S1",
        status="expired",
        issued_at=ISSUED_AT,
        expires_at=EXPIRES_AT,
    )

    assert "radio blackout" in radio
    assert "solar radiation storm" in radiation


def test_unknown_status_admits_it_cannot_tell(
) -> None:
    result = explain_alert(
        alert_type="alert",
        severity=None,
        status="unknown",
        issued_at=ISSUED_AT,
        expires_at=None,
    )

    assert "cannot determine" in result


def test_alert_explanation_flags_unknown_status(
) -> None:
    explanation = build_alert_explanation(
        alert_type="alert",
        severity=None,
        status="unknown",
        issued_at=ISSUED_AT,
        expires_at=None,
    )

    assert any(
        "cannot be determined" in caveat
        for caveat in explanation.caveats
    )


# -------------------------------------------------
# Assembled explanations
# -------------------------------------------------

def test_current_explanation_reports_age_and_caveat(
) -> None:
    activity = classify_planetary_k_index(1.67)

    explanation = build_current_explanation(
        kp=1.67,
        activity=activity,
        freshness=freshness("stale", 5000),
    )

    assert "1.67" in explanation.summary

    assert any(
        "83 hours" in detail
        for detail in explanation.details
    )

    assert (
        STALE_DATA_CAVEAT
        in explanation.caveats
    )


def test_current_explanation_is_deterministic(
) -> None:
    activity = classify_planetary_k_index(6.0)

    first = build_current_explanation(
        kp=6.0,
        activity=activity,
        freshness=freshness("current", 60),
    )

    second = build_current_explanation(
        kp=6.0,
        activity=activity,
        freshness=freshness("current", 60),
    )

    assert first == second


def risk_assessment(
    level: str,
) -> SpaceWeatherRiskAssessment:
    return SpaceWeatherRiskAssessment(
        level=level,
        contributing_factors=[
            SpaceWeatherRiskFactor(
                rule_id="KP_G1_G2",
                factor="planetary_k_index",
                value=5.0,
                unit="index",
                description=(
                    "Planetary K-index indicates "
                    "G1 geomagnetic storm activity."
                ),
            )
        ],
        rule_ids=["KP_G1_G2"],
    )


def test_risk_explanation_lists_rule_ids(
) -> None:
    activity = classify_planetary_k_index(5.0)

    explanation = build_risk_explanation(
        risk=risk_assessment("moderate"),
        activity=activity,
        kp=5.0,
        solar_wind_speed_km_s=550.0,
        solar_wind_density_per_cm3=12.0,
    )

    assert "moderate" in explanation.summary

    assert any(
        detail.startswith("KP_G1_G2:")
        for detail in explanation.details
    )


def test_risk_explanation_flags_absent_solar_wind(
) -> None:
    activity = classify_planetary_k_index(5.0)

    explanation = build_risk_explanation(
        risk=risk_assessment("moderate"),
        activity=activity,
        kp=5.0,
    )

    assert (
        MISSING_SOLAR_WIND_CAVEAT
        in explanation.caveats
    )


def test_risk_explanation_omits_caveat_with_data(
) -> None:
    activity = classify_planetary_k_index(5.0)

    explanation = build_risk_explanation(
        risk=risk_assessment("moderate"),
        activity=activity,
        kp=5.0,
        solar_wind_speed_km_s=550.0,
        solar_wind_density_per_cm3=12.0,
    )

    assert (
        MISSING_SOLAR_WIND_CAVEAT
        not in explanation.caveats
    )


def test_risk_explanation_never_invents_a_level(
) -> None:
    """
    The explanation engine describes the risk level
    it is given. It must not recompute one.
    """

    activity = classify_planetary_k_index(5.0)

    explanation = build_risk_explanation(
        risk=risk_assessment("severe"),
        activity=activity,
        kp=5.0,
    )

    assert "severe" in explanation.summary
