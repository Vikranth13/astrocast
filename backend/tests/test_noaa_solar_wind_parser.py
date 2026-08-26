from parsers.noaa_solar_wind_parser import (
    parse_noaa_solar_wind,
)
from decimal import Decimal

ACTIVE_RECORD = {
    "time_tag": "2026-08-26T00:39:07",
    "active": True,
    "source": "SOLAR1",
    "proton_speed": Decimal("326.42"),
    "proton_temperature": Decimal("33643"),
    "proton_density": Decimal("3.8"),
}


def test_parses_active_solar_wind_record(
) -> None:
    result = parse_noaa_solar_wind(
        [ACTIVE_RECORD]
    )

    assert len(result) == 3

    metrics = {
        item.metric_name: item
        for item in result
    }

    # assert (
    #     metrics[
    #         "solar_wind_speed"
    #     ].numeric_value
    #     == 326.42
    # )
    assert (
    metrics["solar_wind_speed"].numeric_value
    == Decimal("326.42")
    )

    assert (
        metrics[
            "solar_wind_speed"
        ].unit
        == "km/s"
    )

    # assert (
    #     metrics[
    #         "solar_wind_density"
    #     ].numeric_value
    #     == 3.8
    # )
    assert (
    metrics["solar_wind_density"].numeric_value
    == Decimal("3.8")
    )

    assert (
        metrics[
            "solar_wind_density"
        ].unit
        == "1/cm^3"
    )

    # assert (
    #     metrics[
    #         "solar_wind_temperature"
    #     ].numeric_value
    #     == 33643
    # )
    assert (
    metrics[
        "solar_wind_temperature"
    ].numeric_value
    == Decimal("33643")
    )
    
    assert (
        metrics[
            "solar_wind_temperature"
        ].unit
        == "K"
    )

    assert (
        metrics[
            "solar_wind_speed"
        ].station
        == "SOLAR1"
    )

def test_ignores_inactive_solar_wind_record(
) -> None:
    inactive = {
        **ACTIVE_RECORD,
        "active": False,
        "source": "IMAP",
    }

    result = parse_noaa_solar_wind(
        [inactive]
    )

    assert result == []

def test_skips_missing_metric_values(
) -> None:
    record = {
        **ACTIVE_RECORD,
        "proton_density": None,
        "proton_temperature": None,
    }

    result = parse_noaa_solar_wind(
        [record]
    )

    assert len(result) == 1

    assert (
        result[0].metric_name
        == "solar_wind_speed"
    )