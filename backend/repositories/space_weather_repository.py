from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import (
    insert as postgresql_insert,
)
from sqlalchemy.orm import Session

from models.space_weather_measurement import (
    SpaceWeatherMeasurement,
)


MEASUREMENT_UNIQUE_CONSTRAINT = (
    "uq_space_weather_measurements_"
    "source_dedup_key"
)


def get_latest_measurement(
    db: Session,
    source: str,
    metric_name: str,
) -> SpaceWeatherMeasurement | None:
    statement = (
        select(
            SpaceWeatherMeasurement
        )
        .where(
            SpaceWeatherMeasurement.source
            == source,
            SpaceWeatherMeasurement.metric_name
            == metric_name,
        )
        .order_by(
            SpaceWeatherMeasurement
            .observed_at
            .desc()
        )
        .limit(1)
    )

    return db.scalars(
        statement
    ).first()


def list_measurements(
    db: Session,
    source: str,
    metric_name: str,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 500,
) -> list[SpaceWeatherMeasurement]:
    statement = (
        select(
            SpaceWeatherMeasurement
        )
        .where(
            SpaceWeatherMeasurement.source
            == source,
            SpaceWeatherMeasurement.metric_name
            == metric_name,
        )
    )

    if start is not None:
        statement = statement.where(
            SpaceWeatherMeasurement.observed_at
            >= start
        )

    if end is not None:
        statement = statement.where(
            SpaceWeatherMeasurement.observed_at
            <= end
        )

    statement = (
        statement
        .order_by(
            SpaceWeatherMeasurement
            .observed_at
            .asc()
        )
        .limit(limit)
    )

    return list(
        db.scalars(statement).all()
    )


def insert_measurements_ignore_duplicates(
    db: Session,
    values: list[dict],
) -> int:
    if not values:
        return 0

    statement = (
        postgresql_insert(
            SpaceWeatherMeasurement
        )
        .values(values)
        .on_conflict_do_nothing(
            constraint=(
                MEASUREMENT_UNIQUE_CONSTRAINT
            )
        )
        .returning(
            SpaceWeatherMeasurement.id
        )
    )

    inserted_ids = (
        db.execute(statement)
        .scalars()
        .all()
    )

    return len(inserted_ids)