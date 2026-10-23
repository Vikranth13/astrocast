from datetime import datetime

from sqlalchemy import (
    func,
    select,
)
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
            .desc()
        )
        .limit(limit)
    )

    measurements = list(
        db.scalars(statement).all()
    )

    measurements.reverse()

    return measurements


def list_hourly_averages(
    db: Session,
    source: str,
    metric_name: str,
    start: datetime,
    end: datetime,
) -> list[tuple[datetime, float, int]]:
    """
    Average one metric over each UTC hour between start and end.

    Returns (hour start, average, reading count) for every hour that
    holds at least one reading, oldest first. Hours with no readings are
    absent, and the caller decides how to show them.

    The hour is cut in UTC explicitly. date_trunc on its own would use
    the database session's time zone, and a non-UTC session would shift
    every bucket.
    """

    hour = func.date_trunc(
        "hour",
        SpaceWeatherMeasurement.observed_at,
        "UTC",
    ).label("hour")

    statement = (
        select(
            hour,
            func.avg(
                SpaceWeatherMeasurement.numeric_value
            ),
            func.count(
                SpaceWeatherMeasurement.numeric_value
            ),
        )
        .where(
            SpaceWeatherMeasurement.source
            == source,
            SpaceWeatherMeasurement.metric_name
            == metric_name,
            SpaceWeatherMeasurement.observed_at
            >= start,
            SpaceWeatherMeasurement.observed_at
            <= end,
            SpaceWeatherMeasurement.numeric_value
            .is_not(None),
        )
        .group_by(hour)
        .order_by(hour)
    )

    return [
        (
            row[0],
            float(row[1]),
            int(row[2]),
        )
        for row in db.execute(statement).all()
    ]


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