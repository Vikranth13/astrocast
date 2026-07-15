def calculate_stargazing_score(conditions: dict):
    """
    Calculate a beginner-friendly stargazing score from 0 to 100.

    The score starts at 100 and subtracts points for conditions that make
    stargazing worse:
    - cloud cover
    - precipitation probability
    - strong wind
    - poor visibility
    """

    cloud_cover = conditions.get("cloud_cover_percent")
    precipitation_probability = conditions.get("precipitation_probability_percent")
    wind_speed = conditions.get("wind_speed_mph")
    visibility = conditions.get("visibility_miles")

    score = 100
    reasons = []

    # Cloud cover matters most for stargazing.
    if cloud_cover is not None:
        cloud_penalty = cloud_cover * 0.7
        score -= cloud_penalty

        if cloud_cover >= 70:
            reasons.append("cloud cover is very high")
        elif cloud_cover >= 40:
            reasons.append("there is moderate cloud cover")
        else:
            reasons.append("cloud cover is low")

    # Rain chance makes stargazing less reliable.
    if precipitation_probability is not None:
        precipitation_penalty = precipitation_probability * 0.2
        score -= precipitation_penalty

        if precipitation_probability >= 50:
            reasons.append("there is a high chance of precipitation")
        elif precipitation_probability >= 20:
            reasons.append("there is some chance of precipitation")
        else:
            reasons.append("rain chances are minimal")

    # Wind does not block stars directly, but strong wind makes observing unpleasant.
    if wind_speed is not None:
        if wind_speed >= 25:
            score -= 15
            reasons.append("wind speeds are strong")
        elif wind_speed >= 15:
            score -= 8
            reasons.append("wind may make viewing less comfortable")
        else:
            reasons.append("wind conditions are calm")

    # Visibility is useful, but Open-Meteo may not always give perfect visibility data.
    if visibility is not None:
        if visibility < 3:
            score -= 20
            reasons.append("visibility is poor")
        elif visibility < 7:
            score -= 10
            reasons.append("visibility is moderate")
        else:
            reasons.append("visibility is good")

    # Keep score between 0 and 100.
    score = max(0, min(100, round(score)))

    rating = get_rating(score)
    explanation = build_explanation(score, rating, reasons)

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


def build_explanation(score: int, rating: str, reasons: list[str]):
    if not reasons:
        return "Not enough weather data was available to explain the stargazing score."

    reason_text = format_reasons(reasons)

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