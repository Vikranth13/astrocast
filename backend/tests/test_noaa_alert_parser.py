from datetime import timezone

from parsers.noaa_alert_parser import (
    parse_noaa_alerts,
)


SAMPLE_ALERT = {
    "product_id": "EF3A",
    "issue_datetime": (
        "2026-08-24 10:36:29.100"
    ),
    "message": (
        "Space Weather Message Code: ALTEF3\r\n"
        "Serial Number: 3727\r\n"
        "Issue Time: 2026 Aug 24 1036 UTC\r\n"
        "\r\n"
        "CONTINUED ALERT: Electron 2MeV Integral "
        "Flux exceeded 1,000pfu\r\n"
        "Continuation of Serial Number: 3726\n"
        "Begin Time: 2026 Aug 21 1105 UTC\n"
        "\n"
        "Yesterday Maximum 2MeV Flux: 1026 pfu\n"
        "Max time: 2026 Aug 24 1030 UTC"
    ),
}


def test_parse_noaa_alert() -> None:
    result = parse_noaa_alerts(
        [SAMPLE_ALERT]
    )

    assert len(result) == 1

    alert = result[0]

    assert alert.source == "NOAA_SWPC"

    assert alert.external_id == (
        "EF3A:3727"
    )

    assert alert.alert_type == "alert"

    assert alert.severity is None

    assert alert.expires_at is None

    assert (
        alert.issued_at.tzinfo
        == timezone.utc
    )

    assert alert.summary.startswith(
        "CONTINUED ALERT:"
    )

    assert len(
        alert.deduplication_key
    ) == 64


def test_alert_deduplication_key_is_stable() -> None:
    first = parse_noaa_alerts(
        [SAMPLE_ALERT]
    )[0]

    second = parse_noaa_alerts(
        [SAMPLE_ALERT]
    )[0]

    assert (
        first.deduplication_key
        == second.deduplication_key
    )

def test_parser_keeps_latest_alert_when_external_id_repeats() -> None:
    original = {
        "product_id": "K06A",
        "issue_datetime": (
            "2026-08-08 21:00:26.140"
        ),
        "message": (
            "Space Weather Message Code: ALTK06\n"
            "Serial Number: 725\n"
            "Issue Time: 2026 Aug 08 2100 UTC\n"
            "\n"
            "ALERT: Geomagnetic K-index of 6\n"
            "Threshold Reached: "
            "2026 Aug 08 2100 UTC\n"
            "Synoptic Period: 2100-2400\n"
            "Active Warning: YES\n"
            "NOAA Scale: G2 - Moderate"
        ),
    }

    corrected = {
        "product_id": "K06A",
        "issue_datetime": (
            "2026-08-08 21:08:07.987"
        ),
        "message": (
            "Space Weather Message Code: ALTK06\n"
            "Serial Number: 725\n"
            "Issue Time: 2026 Aug 08 2108 UTC\n"
            "\n"
            "ALERT: Geomagnetic K-index of 6\n"
            "Threshold Reached: "
            "2026 Aug 08 2100 UTC\n"
            "Synoptic Period: 1800-2100\n"
            "Active Warning: YES\n"
            "NOAA Scale: G2 - Moderate\n"
            "Comment: Corrected for synoptic period\n"
            "\n"
            "CORRECTED"
        ),
    }

    result = parse_noaa_alerts(
        [
            original,
            corrected,
        ]
    )

    assert len(result) == 1

    alert = result[0]

    assert alert.external_id == (
        "K06A:725"
    )

    assert (
        alert.issued_at.isoformat()
        == "2026-08-08T21:08:07.987000+00:00"
    )

    assert (
        alert.raw_payload[
            "issue_datetime"
        ]
        == "2026-08-08 21:08:07.987"
    )

    assert "CORRECTED" in (
        alert.raw_payload["message"]
    )

def test_latest_alert_selection_does_not_depend_on_source_order() -> None:
    older = {
        "product_id": "TEST",
        "issue_datetime": (
            "2026-08-08 21:00:00.000"
        ),
        "message": (
            "Serial Number: 100\n"
            "ALERT: Older notification"
        ),
    }

    newer = {
        "product_id": "TEST",
        "issue_datetime": (
            "2026-08-08 21:10:00.000"
        ),
        "message": (
            "Serial Number: 100\n"
            "ALERT: Corrected notification"
        ),
    }

    first_result = parse_noaa_alerts(
        [
            older,
            newer,
        ]
    )

    second_result = parse_noaa_alerts(
        [
            newer,
            older,
        ]
    )

    assert len(first_result) == 1
    assert len(second_result) == 1

    assert (
        first_result[0].issued_at
        == second_result[0].issued_at
    )

    assert (
        first_result[0].raw_payload[
            "message"
        ]
        == "Serial Number: 100\n"
        "ALERT: Corrected notification"
    )