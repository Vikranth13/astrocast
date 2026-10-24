from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from models.forecast_snapshot import ForecastSnapshot
from models.location import Location


def get_latest_snapshot(
    db: Session,
    location_id: int,
    forecast_time: str,
) -> ForecastSnapshot | None:
    """
    The most recent snapshot of one place's forecast for one forecast
    hour.
    """

    statement = (
        select(
            ForecastSnapshot
        )
        .where(
            ForecastSnapshot.location_id
            == location_id,
            ForecastSnapshot.forecast_time
            == forecast_time,
        )
        .order_by(
            ForecastSnapshot.retrieved_at.desc(),
            ForecastSnapshot.id.desc(),
        )
        .limit(1)
    )

    return db.scalars(
        statement
    ).first()


def add_snapshot(
    db: Session,
    values: dict[str, Any],
) -> ForecastSnapshot:
    snapshot = ForecastSnapshot(
        **values
    )

    db.add(snapshot)

    return snapshot


def refresh_snapshot(
    snapshot: ForecastSnapshot,
    values: dict[str, Any],
) -> ForecastSnapshot:
    """
    Overwrite a snapshot with a newer check of the same forecast.
    """

    for name, value in values.items():
        setattr(
            snapshot,
            name,
            value,
        )

    return snapshot


def list_snapshots(
    db: Session,
    location_id: int,
    limit: int,
) -> list[ForecastSnapshot]:
    """
    One place's snapshots, newest first.
    """

    statement = (
        select(
            ForecastSnapshot
        )
        .where(
            ForecastSnapshot.location_id
            == location_id
        )
        .order_by(
            ForecastSnapshot.retrieved_at.desc(),
            ForecastSnapshot.id.desc(),
        )
        .limit(limit)
    )

    return list(
        db.scalars(statement).all()
    )


def list_latest_snapshot_per_location(
    db: Session,
    limit: int,
) -> list[tuple[Location, ForecastSnapshot]]:
    """
    Every searched place with its most recent snapshot, most recently
    checked first.

    DISTINCT ON keeps the first row for each location in the inner
    ordering, which is that location's newest snapshot.
    """

    latest = (
        select(
            ForecastSnapshot
        )
        .distinct(
            ForecastSnapshot.location_id
        )
        .order_by(
            ForecastSnapshot.location_id,
            ForecastSnapshot.retrieved_at.desc(),
            ForecastSnapshot.id.desc(),
        )
        .subquery()
    )

    latest_snapshot = aliased(
        ForecastSnapshot,
        latest,
    )

    statement = (
        select(
            Location,
            latest_snapshot,
        )
        .join(
            latest_snapshot,
            latest_snapshot.location_id
            == Location.id,
        )
        .order_by(
            latest_snapshot.retrieved_at.desc(),
        )
        .limit(limit)
    )

    return [
        (
            row[0],
            row[1],
        )
        for row in db.execute(statement).all()
    ]
