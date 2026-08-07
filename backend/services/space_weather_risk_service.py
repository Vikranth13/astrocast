from decimal import Decimal

from schemas.space_weather import (
    GeomagneticActivity,
)


G1_THRESHOLD = 4.67
G2_THRESHOLD = 5.67
G3_THRESHOLD = 6.67
G4_THRESHOLD = 7.67
G5_THRESHOLD = 9.00


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