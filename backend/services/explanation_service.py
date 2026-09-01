"""
Deterministic plain-English explanation templates for
AstroCast space-weather output.

Every function in this module is pure. There is no
database access, no HTTP access, and no reading of the
current clock. Anything time-dependent is passed in.

This is deliberate. The roadmap requires explanations
to be deterministic and testable, and it explicitly
forbids an AI layer from being responsible for risk
classification or from inventing measurements.
"""

from datetime import datetime

from schemas.space_weather import (
    AlertSeverity,
    AlertStatus,
    AlertType,
    GeomagneticActivity,
    SpaceWeatherExplanation,
    SpaceWeatherFreshness,
    SpaceWeatherRiskAssessment,
)
from services.space_weather_risk_service import (
    SOLAR_WIND_ELEVATED_DENSITY_PER_CM3,
    SOLAR_WIND_ELEVATED_SPEED_KM_S,
)


# -------------------------------------------------
# Caveats
#
# The roadmap data-trust rules require AstroCast to
# state where the stored data cannot support a
# conclusion, rather than quietly overreaching.
# -------------------------------------------------

AURORA_LOCATION_CAVEAT = (
    "Geomagnetic activity alone does not establish "
    "whether aurora will be visible from a specific "
    "place. Local visibility also depends on "
    "geomagnetic latitude, hours of darkness, and "
    "cloud cover, none of which are included in this "
    "assessment."
)

DELAYED_DATA_CAVEAT = (
    "This observation is no longer recent, so "
    "conditions may already have changed."
)

STALE_DATA_CAVEAT = (
    "This observation is old enough that it should "
    "not be treated as a description of current "
    "conditions. Run NOAA ingestion for fresher data."
)

MISSING_SOLAR_WIND_CAVEAT = (
    "No stored solar-wind measurement was available, "
    "so this assessment is based on the planetary "
    "K-index alone."
)

INFORMATIONAL_CAVEAT = (
    "AstroCast output is informational and depends on "
    "the accuracy and timeliness of the NOAA source "
    "data."
)


# -------------------------------------------------
# NOAA G-scale technology impacts
#
# Summarized from the NOAA space-weather scales and
# kept as a table rather than a chain of
# if-statements, so the wording is easy to review.
# -------------------------------------------------

TECHNOLOGY_IMPACTS_BY_SCALE = {
    "G1": (
        "Weak power-grid fluctuations are possible "
        "and minor effects on satellite operations "
        "may occur."
    ),
    "G2": (
        "High-latitude power systems may see voltage "
        "alarms, and high-frequency radio propagation "
        "can fade at higher latitudes."
    ),
    "G3": (
        "Voltage corrections may be required on power "
        "systems, satellite components can accumulate "
        "surface charge, and satellite navigation and "
        "high-frequency radio may be intermittent."
    ),
    "G4": (
        "Widespread voltage-control problems are "
        "possible, induced currents can affect "
        "pipelines, satellite navigation may be "
        "degraded for hours, and high-frequency radio "
        "can be sporadic."
    ),
    "G5": (
        "Power grids can experience widespread "
        "voltage-control and protective-system "
        "problems, satellite operations may be "
        "significantly affected, high-frequency radio "
        "can be impossible in many areas, and "
        "satellite navigation may be degraded for "
        "days."
    ),
}


SEVERITY_FAMILY_LABELS = {
    "G": "geomagnetic storm",
    "R": "radio blackout",
    "S": "solar radiation storm",
}


# The article depends on how the scale letter is
# spoken, not on how it is spelled: "a G3", but
# "an R2" and "an S1".
SEVERITY_ARTICLES = {
    "G": "a",
    "R": "an",
    "S": "an",
}


ALERT_TYPE_NOUNS = {
    "alert": "alert",
    "warning": "warning",
    "watch": "watch",
    "summary": "summary",
    "cancellation": "cancellation",
    "other": "notification",
}


ALERT_TYPE_MEANINGS = {
    "alert": (
        "An alert means the described conditions "
        "have been observed."
    ),
    "warning": (
        "A warning means the described conditions "
        "are expected."
    ),
    "watch": (
        "A watch means the described conditions are "
        "considered possible."
    ),
    "summary": (
        "A summary describes an event that has "
        "already occurred."
    ),
    "cancellation": (
        "A cancellation withdraws a previously "
        "issued notification."
    ),
}


def format_age(
    age_minutes: int,
) -> str:
    """
    Convert a minute count into readable text.
    """

    if age_minutes < 60:
        return f"{age_minutes} minutes"

    hours = age_minutes // 60
    remaining_minutes = age_minutes % 60

    if remaining_minutes == 0:
        return f"{hours} hours"

    return (
        f"{hours} hours and "
        f"{remaining_minutes} minutes"
    )


def format_timestamp(
    value: datetime,
) -> str:
    """
    Render a timestamp for use inside explanation
    sentences.
    """

    return value.strftime(
        "%Y-%m-%d %H:%M UTC"
    )


def explain_kp(
    kp: float,
    activity: GeomagneticActivity,
) -> str:
    """
    Describe one planetary K-index value and the
    geomagnetic classification it produced.

    The classification is passed in rather than
    recalculated, so this module can never disagree
    with the risk engine.
    """

    if activity.noaa_scale is None:
        return (
            f"The planetary K-index is {kp:.2f}, "
            "which is below the NOAA G1 geomagnetic "
            "storm threshold."
        )

    return (
        f"The planetary K-index is {kp:.2f}, which "
        f"reaches NOAA {activity.noaa_scale} "
        f"({activity.label.lower()})."
    )


def explain_solar_wind(
    speed_km_s: float | None,
    density_per_cm3: float | None,
    temperature_k: float | None = None,
) -> str | None:
    """
    Describe the stored solar-wind conditions.

    Returns None when no solar-wind measurement is
    available, so callers can add a caveat instead of
    presenting an invented sentence.
    """

    if (
        speed_km_s is None
        and density_per_cm3 is None
        and temperature_k is None
    ):
        return None

    parts: list[str] = []

    if speed_km_s is not None:
        if (
            speed_km_s
            >= SOLAR_WIND_ELEVATED_SPEED_KM_S
        ):
            speed_wording = "elevated"

        else:
            speed_wording = "within typical range"

        parts.append(
            f"solar-wind speed is "
            f"{speed_km_s:.0f} km/s "
            f"({speed_wording})"
        )

    if density_per_cm3 is not None:
        if (
            density_per_cm3
            >= SOLAR_WIND_ELEVATED_DENSITY_PER_CM3
        ):
            density_wording = "elevated"

        else:
            density_wording = "within typical range"

        parts.append(
            f"proton density is "
            f"{density_per_cm3:.1f} per cubic "
            f"centimetre ({density_wording})"
        )

    if temperature_k is not None:
        parts.append(
            f"plasma temperature is "
            f"{temperature_k:.0f} K"
        )

    if len(parts) == 1:
        body = parts[0]

    else:
        body = (
            ", ".join(parts[:-1])
            + ", and "
            + parts[-1]
        )

    return (
        "In the latest stored solar-wind reading, "
        f"{body}."
    )


def explain_aurora_implications(
    activity: GeomagneticActivity,
) -> str:
    """
    Describe what the geomagnetic classification
    implies for aurora, always followed by the
    location caveat.

    The caveat is not optional. The roadmap forbids
    implying aurora visibility from Kp alone.
    """

    if activity.noaa_scale is None:
        lead = (
            "Activity is below storm level, so aurora "
            "is unlikely to extend beyond the usual "
            "high-latitude auroral zone."
        )

    elif activity.noaa_scale in ("G1", "G2"):
        lead = (
            "Storm-level activity of this size can "
            "push the auroral oval toward higher "
            "mid-latitudes."
        )

    elif activity.noaa_scale == "G3":
        lead = (
            "A strong storm can bring aurora to "
            "mid-latitudes."
        )

    else:
        lead = (
            "A storm of this size can bring aurora "
            "well into mid-latitudes and, at the "
            "upper end, considerably further."
        )

    return f"{lead} {AURORA_LOCATION_CAVEAT}"


def explain_technology_impacts(
    activity: GeomagneticActivity,
) -> str | None:
    """
    Describe the NOAA-documented technology effects
    associated with the current storm level.

    Returns None below storm level, where NOAA
    documents no routine impacts.
    """

    if activity.noaa_scale is None:
        return None

    return TECHNOLOGY_IMPACTS_BY_SCALE[
        activity.noaa_scale
    ]


def freshness_caveat(
    freshness: SpaceWeatherFreshness,
) -> str | None:
    """
    Return a caveat when the stored observation is no
    longer current.
    """

    if freshness.status == "delayed":
        return DELAYED_DATA_CAVEAT

    if freshness.status == "stale":
        return STALE_DATA_CAVEAT

    return None


def describe_freshness(
    freshness: SpaceWeatherFreshness,
) -> str:
    """
    Describe the age of the stored observation.
    """

    readable_age = format_age(
        freshness.age_minutes
    )

    return (
        "The observation is approximately "
        f"{readable_age} old and AstroCast "
        "classifies the source data as "
        f"{freshness.status}."
    )


def severity_family_label(
    severity: AlertSeverity | None,
) -> str | None:
    """
    Map a NOAA severity code to the kind of event it
    describes.
    """

    if severity is None:
        return None

    return SEVERITY_FAMILY_LABELS.get(
        severity[0]
    )


def explain_alert(
    alert_type: AlertType,
    severity: AlertSeverity | None,
    status: AlertStatus,
    issued_at: datetime,
    expires_at: datetime | None = None,
) -> str:
    """
    Describe one persisted NOAA notification.
    """

    noun = ALERT_TYPE_NOUNS.get(
        alert_type,
        ALERT_TYPE_NOUNS["other"],
    )

    family = severity_family_label(
        severity
    )

    if family is None:
        subject = (
            f"NOAA issued a space-weather {noun}"
        )

    else:
        article = SEVERITY_ARTICLES.get(
            severity[0],
            "a",
        )

        subject = (
            f"NOAA issued {article} {severity} "
            f"{family} {noun}"
        )

    sentences = [
        f"{subject} at "
        f"{format_timestamp(issued_at)}."
    ]

    meaning = ALERT_TYPE_MEANINGS.get(
        alert_type
    )

    if meaning is not None:
        sentences.append(
            meaning
        )

    if status == "active":
        if expires_at is not None:
            sentences.append(
                "It is still active and is due to "
                "expire at "
                f"{format_timestamp(expires_at)}."
            )

        else:
            sentences.append(
                "It is still active."
            )

    elif status == "expired":
        if expires_at is not None:
            sentences.append(
                "It expired at "
                f"{format_timestamp(expires_at)}."
            )

        else:
            sentences.append(
                "It has expired."
            )

    else:
        sentences.append(
            "NOAA did not supply an expiration time, "
            "so AstroCast cannot determine whether it "
            "is still in effect."
        )

    return " ".join(sentences)


def build_current_explanation(
    kp: float,
    activity: GeomagneticActivity,
    freshness: SpaceWeatherFreshness,
) -> SpaceWeatherExplanation:
    """
    Assemble the explanation for the current
    space-weather response.
    """

    details = [
        explain_aurora_implications(
            activity
        ),
    ]

    technology = explain_technology_impacts(
        activity
    )

    if technology is not None:
        details.append(
            technology
        )

    details.append(
        describe_freshness(
            freshness
        )
    )

    caveats: list[str] = []

    staleness = freshness_caveat(
        freshness
    )

    if staleness is not None:
        caveats.append(
            staleness
        )

    caveats.append(
        INFORMATIONAL_CAVEAT
    )

    return SpaceWeatherExplanation(
        summary=explain_kp(
            kp,
            activity,
        ),
        details=details,
        caveats=caveats,
    )


def build_risk_explanation(
    risk: SpaceWeatherRiskAssessment,
    activity: GeomagneticActivity,
    kp: float,
    solar_wind_speed_km_s: float | None = None,
    solar_wind_density_per_cm3: float | None = None,
) -> SpaceWeatherExplanation:
    """
    Assemble the explanation for the deterministic
    risk assessment.

    The risk level is never derived here. It is
    produced by the risk engine and only described.
    """

    summary = (
        "AstroCast rates current space-weather risk "
        f"as {risk.level}."
    )

    details = [
        explain_kp(
            kp,
            activity,
        ),
    ]

    solar_wind = explain_solar_wind(
        speed_km_s=solar_wind_speed_km_s,
        density_per_cm3=(
            solar_wind_density_per_cm3
        ),
    )

    if solar_wind is not None:
        details.append(
            solar_wind
        )

    for factor in risk.contributing_factors:
        details.append(
            f"{factor.rule_id}: "
            f"{factor.description}"
        )

    details.append(
        explain_aurora_implications(
            activity
        )
    )

    technology = explain_technology_impacts(
        activity
    )

    if technology is not None:
        details.append(
            technology
        )

    caveats: list[str] = []

    if solar_wind is None:
        caveats.append(
            MISSING_SOLAR_WIND_CAVEAT
        )

    caveats.append(
        INFORMATIONAL_CAVEAT
    )

    return SpaceWeatherExplanation(
        summary=summary,
        details=details,
        caveats=caveats,
    )


def build_alert_explanation(
    alert_type: AlertType,
    severity: AlertSeverity | None,
    status: AlertStatus,
    issued_at: datetime,
    expires_at: datetime | None = None,
) -> SpaceWeatherExplanation:
    """
    Assemble the explanation for one alert-detail
    response.
    """

    details: list[str] = []

    family = severity_family_label(
        severity
    )

    if family == "geomagnetic storm":
        details.append(
            "Geomagnetic storms are disturbances of "
            "the Earth magnetic field driven by solar "
            "activity."
        )

    elif family == "radio blackout":
        details.append(
            "Radio blackouts are caused by solar "
            "flares and mainly affect high-frequency "
            "radio communication on the sunlit side "
            "of the Earth."
        )

    elif family == "solar radiation storm":
        details.append(
            "Solar radiation storms involve energetic "
            "particles that can affect satellites, "
            "high-altitude aviation, and polar "
            "communication."
        )

    caveats: list[str] = []

    if status == "unknown":
        caveats.append(
            "NOAA did not supply an expiration time "
            "for this notification, so its current "
            "status cannot be determined from stored "
            "data."
        )

    caveats.append(
        INFORMATIONAL_CAVEAT
    )

    return SpaceWeatherExplanation(
        summary=explain_alert(
            alert_type=alert_type,
            severity=severity,
            status=status,
            issued_at=issued_at,
            expires_at=expires_at,
        ),
        details=details,
        caveats=caveats,
    )
