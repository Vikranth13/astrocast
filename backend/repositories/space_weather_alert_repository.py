from sqlalchemy.dialects.postgresql import (
    insert as postgresql_insert,
)
from sqlalchemy.orm import Session

from models.space_weather_alert import (
    SpaceWeatherAlert,
)

from datetime import datetime

from sqlalchemy import (
    Select,
    func,
    select,
)


ALERT_UNIQUE_CONSTRAINT = (
    "uq_space_weather_alerts_"
    "source_dedup_key"
)


def insert_alerts_ignore_duplicates(
    db: Session,
    values: list[dict],
) -> int:
    if not values:
        return 0

    statement = (
        postgresql_insert(
            SpaceWeatherAlert
        )
        .values(values)
        .on_conflict_do_nothing(
            constraint=(
                ALERT_UNIQUE_CONSTRAINT
            )
        )
        .returning(
            SpaceWeatherAlert.id
        )
    )

    inserted_ids = (
        db.execute(statement)
        .scalars()
        .all()
    )

    return len(inserted_ids)

def get_alert_by_id(
    db: Session,
    alert_id: int,
) -> SpaceWeatherAlert | None:
    return db.get(
        SpaceWeatherAlert,
        alert_id,
    )


def apply_alert_filters(
    statement: Select,
    severity: str | None = None,
    alert_type: str | None = None,
    source: str | None = None,
    issued_start: datetime | None = None,
    issued_end: datetime | None = None,
    status: str | None = None,
    now: datetime | None = None,
) -> Select:
    """
    Add the alert filters to a query.

    The page of alerts and the count of all matching alerts are built
    from this one function, so the total can never describe a different
    set of alerts from the page beside it.
    """

    if severity is not None:
        statement = statement.where(
            SpaceWeatherAlert.severity
            == severity
        )

    if alert_type is not None:
        statement = statement.where(
            SpaceWeatherAlert.alert_type
            == alert_type
        )

    if source is not None:
        statement = statement.where(
            SpaceWeatherAlert.source
            == source
        )

    if issued_start is not None:
        statement = statement.where(
            SpaceWeatherAlert.issued_at
            >= issued_start
        )

    if issued_end is not None:
        statement = statement.where(
            SpaceWeatherAlert.issued_at
            <= issued_end
        )

    if status == "active":
        statement = statement.where(
            SpaceWeatherAlert.expires_at
            .is_not(None),
            SpaceWeatherAlert.expires_at
            > now,
        )

    elif status == "expired":
        statement = statement.where(
            SpaceWeatherAlert.expires_at
            .is_not(None),
            SpaceWeatherAlert.expires_at
            <= now,
        )

    elif status == "unknown":
        statement = statement.where(
            SpaceWeatherAlert.expires_at
            .is_(None)
        )

    return statement


def list_alerts(
    db: Session,
    severity: str | None = None,
    alert_type: str | None = None,
    source: str | None = None,
    issued_start: datetime | None = None,
    issued_end: datetime | None = None,
    status: str | None = None,
    now: datetime | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[SpaceWeatherAlert]:
    """
    Return one page of matching alerts, newest first.
    """

    statement = apply_alert_filters(
        select(
            SpaceWeatherAlert
        ),
        severity=severity,
        alert_type=alert_type,
        source=source,
        issued_start=issued_start,
        issued_end=issued_end,
        status=status,
        now=now,
    )

    # NOAA issues several products in the same minute. Without the id as
    # a tie-break, alerts sharing an issue time could swap order between
    # requests and appear on two pages, or on none.
    statement = (
        statement
        .order_by(
            SpaceWeatherAlert
            .issued_at
            .desc(),
            SpaceWeatherAlert
            .id
            .desc(),
        )
        .limit(limit)
        .offset(offset)
    )

    return list(
        db.scalars(statement).all()
    )


def count_alerts(
    db: Session,
    severity: str | None = None,
    alert_type: str | None = None,
    source: str | None = None,
    issued_start: datetime | None = None,
    issued_end: datetime | None = None,
    status: str | None = None,
    now: datetime | None = None,
) -> int:
    """
    Count every alert matching the filters, across all pages.
    """

    statement = apply_alert_filters(
        select(
            func.count()
        ).select_from(
            SpaceWeatherAlert
        ),
        severity=severity,
        alert_type=alert_type,
        source=source,
        issued_start=issued_start,
        issued_end=issued_end,
        status=status,
        now=now,
    )

    return db.scalar(statement) or 0