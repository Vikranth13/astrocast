"""
Tests for the stargazing scoring rules and the explanation they produce.

The explanation must describe the conditions that match the rating. A night
scored as poor is explained by what held it back, never by the conditions
that happened to be fine.
"""

import pytest

from services.scoring_service import (
    calculate_stargazing_score,
    find_best_window,
    get_rating,
)


OVERCAST_NIGHT = {
    "cloud_cover_percent": 100,
    "precipitation_probability_percent": 0,
    "wind_speed_mph": 4,
    "visibility_miles": 12,
}

CLEAR_NIGHT = {
    "cloud_cover_percent": 5,
    "precipitation_probability_percent": 0,
    "wind_speed_mph": 4,
    "visibility_miles": 12,
}

MIXED_NIGHT = {
    "cloud_cover_percent": 55,
    "precipitation_probability_percent": 30,
    "wind_speed_mph": 10,
    "visibility_miles": 8,
}


# ---------------------------------------------------------------
# Rating bands
# ---------------------------------------------------------------

@pytest.mark.parametrize(
    (
        "score",
        "expected_rating",
    ),
    [
        (100, "Excellent"),
        (80, "Excellent"),
        (79, "Good"),
        (60, "Good"),
        (59, "Okay"),
        (40, "Okay"),
        (39, "Poor"),
        (20, "Poor"),
        (19, "Bad"),
        (0, "Bad"),
    ],
)
def test_rating_bands(
    score: int,
    expected_rating: str,
) -> None:
    assert get_rating(score) == expected_rating


# ---------------------------------------------------------------
# Explanations describe the rating they belong to
# ---------------------------------------------------------------

def test_poor_score_explains_only_the_limiting_conditions() -> None:
    """
    Total overcast with otherwise fine conditions.

    The explanation must name the cloud cover and must not offer calm wind,
    minimal rain, or good visibility as reasons the night is poor.
    """

    result = calculate_stargazing_score(
        OVERCAST_NIGHT
    )

    assert result["score"] == 30
    assert result["rating"] == "Poor"

    explanation = result["explanation"]

    assert "cloud cover is very high" in explanation

    for favourable in [
        "rain chances are minimal",
        "wind conditions are calm",
        "visibility is good",
    ]:
        assert favourable not in explanation


def test_excellent_score_explains_the_favourable_conditions() -> None:
    result = calculate_stargazing_score(
        CLEAR_NIGHT
    )

    assert result["rating"] == "Excellent"

    explanation = result["explanation"]

    assert "cloud cover is low" in explanation
    assert "visibility is good" in explanation


def test_mixed_score_names_both_and_leads_with_the_limiting_conditions() -> None:
    """
    A mixed rating is the one case where both sides belong in the sentence,
    because the rating itself claims the conditions are mixed.
    """

    result = calculate_stargazing_score(
        MIXED_NIGHT
    )

    assert result["rating"] == "Okay"

    explanation = result["explanation"]

    assert "there is moderate cloud cover" in explanation
    assert "wind conditions are calm" in explanation

    assert (
        explanation.index("moderate cloud cover")
        < explanation.index("wind conditions are calm")
    )


def test_missing_weather_data_is_reported_rather_than_explained() -> None:
    result = calculate_stargazing_score({})

    assert result["explanation"] == (
        "Not enough weather data was available "
        "to explain the stargazing score."
    )


def test_partial_data_only_explains_what_was_measured() -> None:
    """
    A missing reading must not become a silent favourable reason.
    """

    result = calculate_stargazing_score(
        {
            "cloud_cover_percent": 95,
        }
    )

    explanation = result["explanation"]

    assert "cloud cover is very high" in explanation
    assert "wind" not in explanation
    assert "visibility" not in explanation


# ---------------------------------------------------------------
# Factor breakdown
# ---------------------------------------------------------------

def factor_named(
    result: dict,
    name: str,
) -> dict:
    return next(
        factor
        for factor in result["factors"]
        if factor["factor"] == name
    )


def test_factors_carry_the_penalties_the_score_applied() -> None:
    result = calculate_stargazing_score(
        MIXED_NIGHT
    )

    assert [
        factor["factor"]
        for factor in result["factors"]
    ] == [
        "cloud_cover",
        "precipitation_probability",
        "wind_speed",
        "visibility",
    ]

    assert factor_named(result, "cloud_cover")["penalty"] == 38.5
    assert factor_named(result, "precipitation_probability")["penalty"] == 6.0
    assert factor_named(result, "wind_speed")["penalty"] == 0
    assert factor_named(result, "visibility")["penalty"] == 0

    total_penalty = sum(
        factor["penalty"]
        for factor in result["factors"]
    )

    assert result["score"] == round(100 - total_penalty)


def test_factor_notes_reuse_the_explanation_phrases() -> None:
    result = calculate_stargazing_score(
        MIXED_NIGHT
    )

    cloud = factor_named(result, "cloud_cover")

    assert cloud["note"] == "There is moderate cloud cover."
    assert "there is moderate cloud cover" in result["explanation"]


def test_limiting_flags_match_the_explanation_buckets() -> None:
    result = calculate_stargazing_score(
        MIXED_NIGHT
    )

    assert factor_named(result, "cloud_cover")["is_limiting"] is True
    assert factor_named(result, "precipitation_probability")["is_limiting"] is True
    assert factor_named(result, "wind_speed")["is_limiting"] is False
    assert factor_named(result, "visibility")["is_limiting"] is False


def test_limiting_factor_is_the_costliest_limiting_condition() -> None:
    result = calculate_stargazing_score(
        {
            "cloud_cover_percent": 45,
            "wind_speed_mph": 30,
            "visibility_miles": 2,
        }
    )

    # Cloud costs 31.5 points, visibility 20, and wind 15.
    assert result["limiting_factor"] == "Cloud cover"


def test_no_limiting_factor_on_a_clear_night() -> None:
    result = calculate_stargazing_score(
        CLEAR_NIGHT
    )

    assert result["limiting_factor"] is None


def test_missing_readings_produce_no_factor() -> None:
    result = calculate_stargazing_score(
        {
            "cloud_cover_percent": 95,
        }
    )

    assert [
        factor["factor"]
        for factor in result["factors"]
    ] == [
        "cloud_cover",
    ]


# ---------------------------------------------------------------
# Best observing window
# ---------------------------------------------------------------

def night_of(
    scores: list[int],
) -> list[dict]:
    """
    Hourly readings from 18:00 with the given scores.
    """

    return [
        {
            "time": f"2026-10-19T{18 + index:02d}:00",
            "score": score,
        }
        for index, score in enumerate(scores)
    ]


def test_best_window_is_the_longest_good_run() -> None:
    window = find_best_window(
        night_of([70, 40, 65, 72, 88, 61, 30])
    )

    assert window["first_hour"] == "2026-10-19T20:00"
    assert window["last_hour"] == "2026-10-19T23:00"
    assert window["hour_count"] == 4
    assert window["peak_time"] == "2026-10-19T22:00"
    assert window["peak_score"] == 88
    assert window["peak_rating"] == "Excellent"
    assert window["qualifies"] is True


def test_best_window_tie_goes_to_the_earliest_run() -> None:
    window = find_best_window(
        night_of([65, 70, 20, 90, 95])
    )

    assert window["first_hour"] == "2026-10-19T18:00"
    assert window["hour_count"] == 2


def test_a_score_of_exactly_sixty_counts_as_good() -> None:
    window = find_best_window(
        night_of([59, 60, 59])
    )

    assert window["first_hour"] == "2026-10-19T19:00"
    assert window["qualifies"] is True


def test_night_without_a_good_hour_reports_the_best_single_hour() -> None:
    window = find_best_window(
        night_of([20, 52, 45, 52])
    )

    assert window["first_hour"] == "2026-10-19T19:00"
    assert window["last_hour"] == "2026-10-19T19:00"
    assert window["hour_count"] == 1
    assert window["peak_rating"] == "Okay"
    assert window["qualifies"] is False


def test_empty_night_has_no_window() -> None:
    assert find_best_window([]) is None
