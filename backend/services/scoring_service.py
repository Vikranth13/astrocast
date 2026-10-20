# The lowest score rated Good. The best observing window is built from
# hours at or above it.
GOOD_SCORE_THRESHOLD = 60


def build_factor(
    factor: str,
    label: str,
    value: float,
    unit: str,
    penalty: float,
    reason: str,
    is_limiting: bool,
) -> dict:
    """
    Describe how one weather condition moved the score.

    The reason is the same phrase the explanation uses, so the breakdown
    and the sentence above it can never disagree.
    """

    return {
        "factor": factor,
        "label": label,
        "value": value,
        "unit": unit,
        "penalty": round(
            penalty,
            1,
        ),
        "is_limiting": is_limiting,
        "note": f"{reason[0].upper()}{reason[1:]}.",
    }


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

    Every measured condition is also returned as a factor carrying its
    penalty, and the limiting factor with the largest penalty is named, so
    clients can show the breakdown without repeating these rules.
    """

    cloud_cover = conditions.get("cloud_cover_percent")
    precipitation_probability = conditions.get("precipitation_probability_percent")
    wind_speed = conditions.get("wind_speed_mph")
    visibility = conditions.get("visibility_miles")

    score = 100
    limiting_factors = []
    favourable_factors = []
    factors = []

    # Cloud cover matters most for stargazing.
    if cloud_cover is not None:
        cloud_penalty = cloud_cover * 0.7
        score -= cloud_penalty

        if cloud_cover >= 70:
            reason = "cloud cover is very high"
        elif cloud_cover >= 40:
            reason = "there is moderate cloud cover"
        else:
            reason = "cloud cover is low"

        is_limiting = cloud_cover >= 40

        factors.append(
            build_factor(
                factor="cloud_cover",
                label="Cloud cover",
                value=cloud_cover,
                unit="%",
                penalty=cloud_penalty,
                reason=reason,
                is_limiting=is_limiting,
            )
        )

        if is_limiting:
            limiting_factors.append(reason)
        else:
            favourable_factors.append(reason)

    # Rain chance makes stargazing less reliable.
    if precipitation_probability is not None:
        precipitation_penalty = precipitation_probability * 0.2
        score -= precipitation_penalty

        if precipitation_probability >= 50:
            reason = "there is a high chance of precipitation"
        elif precipitation_probability >= 20:
            reason = "there is some chance of precipitation"
        else:
            reason = "rain chances are minimal"

        is_limiting = precipitation_probability >= 20

        factors.append(
            build_factor(
                factor="precipitation_probability",
                label="Rain chance",
                value=precipitation_probability,
                unit="%",
                penalty=precipitation_penalty,
                reason=reason,
                is_limiting=is_limiting,
            )
        )

        if is_limiting:
            limiting_factors.append(reason)
        else:
            favourable_factors.append(reason)

    # Wind does not block stars directly, but strong wind makes observing unpleasant.
    if wind_speed is not None:
        if wind_speed >= 25:
            wind_penalty = 15
            reason = "wind speeds are strong"
        elif wind_speed >= 15:
            wind_penalty = 8
            reason = "wind may make viewing less comfortable"
        else:
            wind_penalty = 0
            reason = "wind conditions are calm"

        score -= wind_penalty

        is_limiting = wind_speed >= 15

        factors.append(
            build_factor(
                factor="wind_speed",
                label="Wind speed",
                value=wind_speed,
                unit="mph",
                penalty=wind_penalty,
                reason=reason,
                is_limiting=is_limiting,
            )
        )

        if is_limiting:
            limiting_factors.append(reason)
        else:
            favourable_factors.append(reason)

    # Visibility is useful, but Open-Meteo may not always give perfect visibility data.
    if visibility is not None:
        if visibility < 3:
            visibility_penalty = 20
            reason = "visibility is poor"
        elif visibility < 7:
            visibility_penalty = 10
            reason = "visibility is moderate"
        else:
            visibility_penalty = 0
            reason = "visibility is good"

        score -= visibility_penalty

        is_limiting = visibility < 7

        factors.append(
            build_factor(
                factor="visibility",
                label="Visibility",
                value=visibility,
                unit="mi",
                penalty=visibility_penalty,
                reason=reason,
                is_limiting=is_limiting,
            )
        )

        if is_limiting:
            limiting_factors.append(reason)
        else:
            favourable_factors.append(reason)

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
        "limiting_factor": find_limiting_factor(
            factors
        ),
        "factors": factors,
    }


def find_limiting_factor(
    factors: list[dict],
) -> str | None:
    """
    Name the limiting factor that costs the most points.

    Returns None when every measured condition is favourable. On a tie the
    first factor in scoring order wins, which puts cloud cover first.
    """

    limiting = [
        factor
        for factor in factors
        if factor["is_limiting"]
    ]

    if not limiting:
        return None

    largest = max(
        limiting,
        key=lambda factor: factor["penalty"],
    )

    return largest["label"]


def find_best_window(
    hours: list[dict],
) -> dict | None:
    """
    Find the best stretch of the observing night.

    The window is the longest run of consecutive hours rated Good or
    better. On a tie the earliest run wins, so the answer does not depend
    on staying up later than necessary.

    When no hour reaches Good, the single highest-scoring hour is returned
    with qualifies set to False, so clients can say plainly that the night
    has no good window instead of inventing one.

    Each hour needs a "time" and a "score". Returns None for an empty
    night.
    """

    if not hours:
        return None

    # -----------------------------------------------------------
    # Longest run at or above the Good threshold
    # -----------------------------------------------------------

    best_run: tuple[int, int] | None = None
    run_start: int | None = None

    for index, hour in enumerate(hours):
        if hour["score"] < GOOD_SCORE_THRESHOLD:
            run_start = None
            continue

        if run_start is None:
            run_start = index

        run_length = index - run_start

        # Strictly longer, so an equal later run never replaces an
        # earlier one.
        if (
            best_run is None
            or run_length > best_run[1] - best_run[0]
        ):
            best_run = (
                run_start,
                index,
            )

    # -----------------------------------------------------------
    # Describe the window, or the best single hour
    # -----------------------------------------------------------

    if best_run is None:
        window_hours = [
            max(
                hours,
                key=lambda hour: hour["score"],
            )
        ]
        qualifies = False

    else:
        window_hours = hours[
            best_run[0]:best_run[1] + 1
        ]
        qualifies = True

    peak = max(
        window_hours,
        key=lambda hour: hour["score"],
    )

    return {
        "first_hour": window_hours[0]["time"],
        "last_hour": window_hours[-1]["time"],
        "hour_count": len(window_hours),
        "peak_time": peak["time"],
        "peak_score": peak["score"],
        "peak_rating": get_rating(
            peak["score"]
        ),
        "qualifies": qualifies,
    }


def get_rating(score: int):
    if score >= 80:
        return "Excellent"
    if score >= GOOD_SCORE_THRESHOLD:
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
