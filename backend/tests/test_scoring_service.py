"""
Tests for the stargazing scoring rules and the explanation they produce.

The explanation must describe the conditions that match the rating. A night
scored as poor is explained by what held it back, never by the conditions
that happened to be fine.
"""

import pytest

from services.scoring_service import (
    calculate_stargazing_score,
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
