from decimal import Decimal

from schemas.space_weather import (
    GeomagneticActivity,
    SpaceWeatherRiskAssessment,
    SpaceWeatherRiskFactor,
)


G1_THRESHOLD = 4.67
G2_THRESHOLD = 5.67
G3_THRESHOLD = 6.67
G4_THRESHOLD = 7.67
G5_THRESHOLD = 9.00

SOLAR_WIND_ELEVATED_SPEED_KM_S = 500.0

SOLAR_WIND_ELEVATED_DENSITY_PER_CM3 = 10.0

def classify_planetary_k_index(
    kp: Decimal | float,
) -> GeomagneticActivity:
    """
    Convert a planetary K-index value into an
    AstroCast geomagnetic-activity classification.

    Thresholds account for the third-step decimal
    representation used by the NOAA JSON product.
    """

    numeric_kp = float(kp)

    if numeric_kp < 0 or numeric_kp > 9:
        raise ValueError(
            "Planetary K-index must be "
            "between 0 and 9."
        )

    if numeric_kp >= G5_THRESHOLD:
        return GeomagneticActivity(
            level="extreme",
            label="Extreme geomagnetic storm",
            noaa_scale="G5",
            is_storm=True,
        )

    if numeric_kp >= G4_THRESHOLD:
        return GeomagneticActivity(
            level="severe",
            label="Severe geomagnetic storm",
            noaa_scale="G4",
            is_storm=True,
        )

    if numeric_kp >= G3_THRESHOLD:
        return GeomagneticActivity(
            level="strong",
            label="Strong geomagnetic storm",
            noaa_scale="G3",
            is_storm=True,
        )

    if numeric_kp >= G2_THRESHOLD:
        return GeomagneticActivity(
            level="moderate",
            label="Moderate geomagnetic storm",
            noaa_scale="G2",
            is_storm=True,
        )

    if numeric_kp >= G1_THRESHOLD:
        return GeomagneticActivity(
            level="minor",
            label="Minor geomagnetic storm",
            noaa_scale="G1",
            is_storm=True,
        )

    return GeomagneticActivity(
        level="below_storm",
        label="Below geomagnetic storm level",
        noaa_scale=None,
        is_storm=False,
    )

def validate_optional_nonnegative(
    value: Decimal | float | None,
    field_name: str,
) -> float | None:
    if value is None:
        return None

    numeric_value = float(value)

    if numeric_value < 0:
        raise ValueError(
            f"{field_name} must be non-negative."
        )

    return numeric_value

def assess_space_weather_risk(
    kp: Decimal | float,
    solar_wind_speed_km_s: Decimal | float | None = None,
    solar_wind_density_per_cm3: Decimal | float | None = None,
) -> SpaceWeatherRiskAssessment:
    """
    Produce a deterministic AstroCast
    space-weather risk assessment.

    Kp is the primary geomagnetic signal.

    Solar-wind speed and density are supporting
    conditions and can raise risk conservatively,
    but cannot independently produce Severe risk.
    """

    activity = classify_planetary_k_index(
        kp
    )

    numeric_kp = float(kp)

    speed = validate_optional_nonnegative(
        solar_wind_speed_km_s,
        "Solar-wind speed",
    )

    density = validate_optional_nonnegative(
        solar_wind_density_per_cm3,
        "Solar-wind density",
    )

    factors: list[
        SpaceWeatherRiskFactor
    ] = []

    rule_ids: list[str] = []

    # -------------------------------------------------
    # Primary Kp classification
    # -------------------------------------------------

    if activity.noaa_scale is None:
        level = "low"

        rule_id = "KP_BELOW_G1"

        factors.append(
            SpaceWeatherRiskFactor(
                rule_id=rule_id,
                factor="planetary_k_index",
                value=numeric_kp,
                unit="index",
                description=(
                    "Planetary K-index is below "
                    "NOAA G1 geomagnetic storm "
                    "level."
                ),
            )
        )

        rule_ids.append(
            rule_id
        )

    elif activity.noaa_scale in (
        "G1",
        "G2",
    ):
        level = "moderate"

        rule_id = "KP_G1_G2"

        factors.append(
            SpaceWeatherRiskFactor(
                rule_id=rule_id,
                factor="planetary_k_index",
                value=numeric_kp,
                unit="index",
                description=(
                    "Planetary K-index indicates "
                    f"{activity.noaa_scale} "
                    "geomagnetic storm activity."
                ),
            )
        )

        rule_ids.append(
            rule_id
        )

    elif activity.noaa_scale == "G3":
        level = "high"

        rule_id = "KP_G3"

        factors.append(
            SpaceWeatherRiskFactor(
                rule_id=rule_id,
                factor="planetary_k_index",
                value=numeric_kp,
                unit="index",
                description=(
                    "Planetary K-index indicates "
                    "G3 strong geomagnetic storm "
                    "activity."
                ),
            )
        )

        rule_ids.append(
            rule_id
        )

    else:
        level = "severe"

        rule_id = "KP_G4_G5"

        factors.append(
            SpaceWeatherRiskFactor(
                rule_id=rule_id,
                factor="planetary_k_index",
                value=numeric_kp,
                unit="index",
                description=(
                    "Planetary K-index indicates "
                    f"{activity.noaa_scale} "
                    "severe or extreme geomagnetic "
                    "storm activity."
                ),
            )
        )

        rule_ids.append(
            rule_id
        )

    # -------------------------------------------------
    # Supporting solar-wind factors
    # -------------------------------------------------

    speed_is_elevated = (
        speed is not None
        and speed
        >= SOLAR_WIND_ELEVATED_SPEED_KM_S
    )

    density_is_elevated = (
        density is not None
        and density
        >= SOLAR_WIND_ELEVATED_DENSITY_PER_CM3
    )

    if speed_is_elevated:
        rule_id = "SW_SPEED_ELEVATED"

        factors.append(
            SpaceWeatherRiskFactor(
                rule_id=rule_id,
                factor="solar_wind_speed",
                value=speed,
                unit="km/s",
                description=(
                    "Solar-wind speed is elevated "
                    "relative to the AstroCast "
                    "supporting-condition threshold."
                ),
            )
        )

        rule_ids.append(
            rule_id
        )

    if density_is_elevated:
        rule_id = "SW_DENSITY_ELEVATED"

        factors.append(
            SpaceWeatherRiskFactor(
                rule_id=rule_id,
                factor="solar_wind_density",
                value=density,
                unit="1/cm^3",
                description=(
                    "Solar-wind proton density is "
                    "elevated relative to the "
                    "AstroCast supporting-condition "
                    "threshold."
                ),
            )
        )

        rule_ids.append(
            rule_id
        )

    # -------------------------------------------------
    # Combined supporting-condition escalation
    # -------------------------------------------------

    if (
        speed_is_elevated
        and density_is_elevated
    ):
        rule_id = (
            "SW_FAST_DENSE_ESCALATION"
        )

        rule_ids.append(
            rule_id
        )

        if level == "low":
            level = "moderate"

        elif level == "moderate":
            level = "high"

        # High remains High.
        # Severe remains Severe.
        #
        # Solar-wind speed and density alone
        # cannot create Severe risk.

    return SpaceWeatherRiskAssessment(
        level=level,
        contributing_factors=factors,
        rule_ids=rule_ids,
    )