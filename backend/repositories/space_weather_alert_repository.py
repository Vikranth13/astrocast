from sqlalchemy.dialects.postgresql import (
    insert as postgresql_insert,
)
from sqlalchemy.orm import Session

from models.space_weather_alert import (
    SpaceWeatherAlert,
)

from datetime import datetime

from sqlalchemy import select


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
) -> list[SpaceWeatherAlert]:
    statement = select(
        SpaceWeatherAlert
    )

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

    statement = (
        statement
        .order_by(
            SpaceWeatherAlert
            .issued_at
            .desc()
        )
        .limit(limit)
    )

    return list(
        db.scalars(statement).all()
    )