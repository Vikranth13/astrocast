from datetime import datetime, timezone
import hashlib
import re
from typing import Any

from pydantic import ValidationError

from schemas.noaa_alert import NoaaAlertRecord
from schemas.normalized_alert import (
    NormalizedAlert,
)


SOURCE_NAME = "NOAA_SWPC"


class NoaaAlertParseError(RuntimeError):
    """
    Raised when a NOAA alert record cannot be
    validated or normalized.
    """


def parse_issue_datetime(
    value: str,
) -> datetime:
    try:
        parsed = datetime.fromisoformat(
            value
        )

    except ValueError as error:
        raise NoaaAlertParseError(
            (
                "NOAA alert issue_datetime "
                f"was invalid: {value}"
            )
        ) from error

    if parsed.tzinfo is None:
        return parsed.replace(
            tzinfo=timezone.utc,
        )

    return parsed.astimezone(
        timezone.utc
    )


def extract_serial_number(
    message: str,
) -> str | None:
    match = re.search(
        r"Serial Number:\s*(\d+)",
        message,
        flags=re.IGNORECASE,
    )

    if match is None:
        return None

    return match.group(1)


def extract_alert_type(
    message: str,
) -> str:
    upper_message = message.upper()

    if "CANCEL" in upper_message:
        return "cancellation"

    if "WARNING" in upper_message:
        return "warning"

    if "WATCH" in upper_message:
        return "watch"

    if "ALERT" in upper_message:
        return "alert"

    if "SUMMARY" in upper_message:
        return "summary"

    return "other"


def extract_severity(
    message: str,
) -> str | None:
    match = re.search(
        r"\b([GRS][1-5])\b",
        message,
        flags=re.IGNORECASE,
    )

    if match is None:
        return None

    return match.group(1).upper()


def extract_summary(
    message: str,
) -> str:
    lines = [
        line.strip()
        for line in message.splitlines()
        if line.strip()
    ]

    keywords = (
        "ALERT",
        "WARNING",
        "WATCH",
        "SUMMARY",
        "CANCEL",
    )

    for line in lines:
        upper_line = line.upper()

        if (
            any(
                keyword in upper_line
                for keyword in keywords
            )
            and not upper_line.startswith(
                "SPACE WEATHER MESSAGE CODE:"
            )
        ):
            return line

    ignored_prefixes = (
        "SPACE WEATHER MESSAGE CODE:",
        "SERIAL NUMBER:",
        "ISSUE TIME:",
        "CONTINUATION OF SERIAL NUMBER:",
        "BEGIN TIME:",
        "VALID FROM:",
        "VALID TO:",
    )

    for line in lines:
        upper_line = line.upper()

        if not upper_line.startswith(
            ignored_prefixes
        ):
            return line

    return (
        lines[0]
        if lines
        else "NOAA space-weather notification"
    )


def extract_expiration(
    message: str,
) -> datetime | None:
    match = re.search(
        (
            r"(?:Valid To|Valid Until):\s*"
            r"(\d{4}\s+[A-Za-z]{3}\s+"
            r"\d{1,2}\s+\d{4}\s+UTC)"
        ),
        message,
        flags=re.IGNORECASE,
    )

    if match is None:
        return None

    try:
        return datetime.strptime(
            match.group(1),
            "%Y %b %d %H%M UTC",
        ).replace(
            tzinfo=timezone.utc,
        )

    except ValueError:
        return None

def parse_noaa_alerts(
    records: list[dict[str, Any]],
) -> list[NormalizedAlert]:
    latest_alerts: dict[
        str,
        NormalizedAlert,
    ] = {}

    for index, raw_record in enumerate(
        records
    ):
        try:
            record = (
                NoaaAlertRecord.model_validate(
                    raw_record
                )
            )

        except ValidationError as error:
            raise NoaaAlertParseError(
                (
                    f"NOAA alert record {index} "
                    f"was invalid: {error}"
                )
            ) from error

        issued_at = parse_issue_datetime(
            record.issue_datetime
        )

        serial_number = (
            extract_serial_number(
                record.message
            )
        )

        if serial_number is not None:
            external_id = (
                f"{record.product_id}:"
                f"{serial_number}"
            )

        else:
            external_id = (
                f"{record.product_id}:"
                f"{issued_at.isoformat()}"
            )

        deduplication_key = (
            hashlib.sha256(
                (
                    f"{SOURCE_NAME}|"
                    f"{external_id}"
                ).encode("utf-8")
            )
            .hexdigest()
        )

        normalized_alert = (
            NormalizedAlert(
                source=SOURCE_NAME,
                external_id=external_id,
                deduplication_key=(
                    deduplication_key
                ),
                alert_type=(
                    extract_alert_type(
                        record.message
                    )
                ),
                severity=extract_severity(
                    record.message
                ),
                issued_at=issued_at,
                expires_at=(
                    extract_expiration(
                        record.message
                    )
                ),
                summary=extract_summary(
                    record.message
                ),
                raw_payload=raw_record,
            )
        )

        existing_alert = (
            latest_alerts.get(
                external_id
            )
        )

        if (
            existing_alert is None
            or normalized_alert.issued_at
            > existing_alert.issued_at
        ):
            latest_alerts[
                external_id
            ] = normalized_alert

    return sorted(
        latest_alerts.values(),
        key=lambda alert: alert.issued_at,
        reverse=True,
    )
