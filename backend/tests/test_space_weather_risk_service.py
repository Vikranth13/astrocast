import pytest

from services.space_weather_risk_service import (
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