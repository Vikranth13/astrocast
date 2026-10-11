def calculate_stargazing_score(conditions: dict):
    """
    Calculate a beginner-friendly stargazing score from 0 to 100.

    The score starts at 100 and subtracts points for conditions that make
    stargazing worse:
    - cloud cover
    - precipitation probability
    - strong wind
    - poor visibility

    Reasons are collected into two separate lists. The explanation can then
    describe the conditions that actually match the rating, instead of
    presenting favourable conditions as though they caused a poor score.
    """

    cloud_cover = conditions.get("cloud_cover_percent")
    precipitation_probability = conditions.get("precipitation_probability_percent")
    wind_speed = conditions.get("wind_speed_mph")
    visibility = conditions.get("visibility_miles")

    score = 100
    limiting_factors = []
    favourable_factors = []

    # Cloud cover matters most for stargazing.
    if cloud_cover is not None:
        cloud_penalty = cloud_cover * 0.7
        score -= cloud_penalty

        if cloud_cover >= 70:
            limiting_factors.append("cloud cover is very high")
        elif cloud_cover >= 40:
            limiting_factors.append("there is moderate cloud cover")
        else:
            favourable_factors.append("cloud cover is low")

    # Rain chance makes stargazing less reliable.
    if precipitation_probability is not None:
        precipitation_penalty = precipitation_probability * 0.2
        score -= precipitation_penalty

        if precipitation_probability >= 50:
            limiting_factors.append("there is a high chance of precipitation")
        elif precipitation_probability >= 20:
            limiting_factors.append("there is some chance of precipitation")
        else:
            favourable_factors.append("rain chances are minimal")

    # Wind does not block stars directly, but strong wind makes observing unpleasant.
    if wind_speed is not None:
        if wind_speed >= 25:
            score -= 15
            limiting_factors.append("wind speeds are strong")
        elif wind_speed >= 15:
            score -= 8
            limiting_factors.append("wind may make viewing less comfortable")
        else:
            favourable_factors.append("wind conditions are calm")

    # Visibility is useful, but Open-Meteo may not always give perfect visibility data.
    if visibility is not None:
        if visibility < 3:
            score -= 20
            limiting_factors.append("visibility is poor")
        elif visibility < 7:
            score -= 10
            limiting_factors.append("visibility is moderate")
        else:
            favourable_factors.append("visibility is good")

    # Keep score between 0 and 100.
    score = max(0, min(100, round(score)))

    rating = get_rating(score)

    explanation = build_explanation(
        score,
        limiting_factors,
        favourable_factors,
    )

    return {
        "score": score,
        "rating": rating,
        "explanation": explanation,
    }


def get_rating(score: int):
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Okay"
    if score >= 20:
        return "Poor"
    return "Bad"


def build_explanation(
    score: int,
    limiting_factors: list[str],
    favourable_factors: list[str],
):
    """
    Explain the score using only the conditions that match the rating.

    A good score is explained by what is working in its favour, and a poor
    score by what is holding it back. Listing calm wind and good visibility
    as reasons a night is poor reads as though they were problems, which
    misrepresents the forecast. A mixed rating names both, leading with the
    limiting conditions, because that is what mixed means.

    The remaining conditions are never hidden. They are shown as individual
    readings alongside the explanation.
    """

    if not limiting_factors and not favourable_factors:
        return "Not enough weather data was available to explain the stargazing score."

    if score >= 60:
        drivers = favourable_factors or limiting_factors
    elif score >= 40:
        drivers = limiting_factors + favourable_factors
    else:
        drivers = limiting_factors or favourable_factors

    reason_text = format_reasons(drivers)

    if score >= 80:
        return f"Tonight looks excellent for stargazing because {reason_text}."
    if score >= 60:
        return f"Tonight looks good for stargazing because {reason_text}."
    if score >= 40:
        return f"Tonight looks okay for stargazing, but conditions are mixed because {reason_text}."
    if score >= 20:
        return f"Tonight looks poor for stargazing because {reason_text}."

    return f"Tonight looks bad for stargazing because {reason_text}."


def format_reasons(reasons: list[str]):
    if len(reasons) == 1:
        return reasons[0]

    if len(reasons) == 2:
        return f"{reasons[0]} and {reasons[1]}"

    return f"{', '.join(reasons[:-1])}, and {reasons[-1]}"
