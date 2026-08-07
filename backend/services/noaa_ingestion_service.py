from datetime import datetime, timezone
from time import perf_counter

from sqlalchemy.dialects.postgresql import (
    insert as postgresql_insert,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from clients.noaa_swpc_client import (
    NoaaSwpcClient,
    NoaaSwpcClientError,
)
from config import settings
from models.api_fetch_log import ApiFetchLog
from models.space_weather_measurement import (
    SpaceWeatherMeasurement,
)
from parsers.noaa_kp_parser import (
    NoaaKpParseError,
    parse_noaa_planetary_k_index,
)
from schemas.ingestion import IngestionResult


SOURCE_NAME = "NOAA_SWPC"

MEASUREMENT_UNIQUE_CONSTRAINT = (
    "uq_space_weather_measurements_"
    "source_dedup_key"
)

ERROR_MESSAGE_LIMIT = 2000


class NoaaIngestionError(RuntimeError):
    """
    Base error raised by the NOAA ingestion workflow.
    """


class NoaaIngestionExternalError(
    NoaaIngestionError
):
    """
    Raised when NOAA communication or source
    validation fails.
    """


class NoaaIngestionDatabaseError(
    NoaaIngestionError
):
    """
    Raised when PostgreSQL persistence fails.
    """


def utc_now() -> datetime:
    """
    Return the current timezone-aware UTC time.
    """

    return datetime.now(
        timezone.utc
    )


def elapsed_milliseconds(
    started_at: float,
) -> int:
    """
    Calculate elapsed execution time in milliseconds.
    """

    return round(
        (perf_counter() - started_at) * 1000
    )


def mark_fetch_log_failed(
    db: Session,
    fetch_log_id: int,
    timer_started_at: float,
    error: Exception,
    fetched_count: int,
    http_status_code: int | None,
) -> None:
    """
    Roll back pending work and mark an existing
    fetch-log record as failed.
    """

    db.rollback()

    try:
        fetch_log = db.get(
            ApiFetchLog,
            fetch_log_id,
        )

        if fetch_log is None:
            return

        fetch_log.status = "failed"

        fetch_log.completed_at = utc_now()

        fetch_log.duration_ms = (
            elapsed_milliseconds(
                timer_started_at
            )
        )

        fetch_log.http_status_code = (
            http_status_code
        )

        fetch_log.fetched_count = (
            fetched_count
        )

        fetch_log.inserted_count = 0

        fetch_log.skipped_count = 0

        fetch_log.failed_count = (
            fetched_count
        )

        fetch_log.error_message = str(
            error
        )[:ERROR_MESSAGE_LIMIT]

        db.commit()

    except SQLAlchemyError:
        db.rollback()


def ingest_noaa_planetary_k_index(
    db: Session,
    client: NoaaSwpcClient | None = None,
) -> IngestionResult:
    """
    Fetch, validate, normalize, deduplicate,
    and store NOAA Planetary K-index records.
    """

    timer_started_at = perf_counter()

    fetch_log = ApiFetchLog(
        source=SOURCE_NAME,
        endpoint=(
            settings.noaa_planetary_k_index_url
        ),
        status="started",
        started_at=utc_now(),
    )

    try:
        db.add(fetch_log)
        db.commit()
        db.refresh(fetch_log)

    except SQLAlchemyError as error:
        db.rollback()

        raise NoaaIngestionDatabaseError(
            (
                "NOAA ingestion could not create "
                f"the initial fetch log: {error}"
            )
        ) from error

    fetch_log_id = fetch_log.id

    fetched_count = 0

    http_status_code: int | None = None

    try:
        active_client = (
            client or NoaaSwpcClient()
        )

        fetch_result = (
            active_client
            .fetch_planetary_k_index()
        )

        http_status_code = (
            fetch_result.http_status_code
        )

        fetched_count = len(
            fetch_result.records
        )

        normalized_records = (
            parse_noaa_planetary_k_index(
                fetch_result.records
            )
        )

        values_to_insert = [
            {
                "source": record.source,
                "deduplication_key": (
                    record.deduplication_key
                ),
                "metric_name": (
                    record.metric_name
                ),
                "observed_at": (
                    record.observed_at
                ),
                "numeric_value": (
                    record.numeric_value
                ),
                "text_value": (
                    record.text_value
                ),
                "unit": record.unit,
                "station": record.station,
                "raw_payload": (
                    record.raw_payload
                ),
            }
            for record in normalized_records
        ]

        inserted_count = 0

        if values_to_insert:
            insert_statement = (
                postgresql_insert(
                    SpaceWeatherMeasurement
                )
                .values(values_to_insert)
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
                db.execute(
                    insert_statement
                )
                .scalars()
                .all()
            )

            inserted_count = len(
                inserted_ids
            )

        skipped_count = (
            len(normalized_records)
            - inserted_count
        )

        fetch_log.status = "success"

        fetch_log.completed_at = utc_now()

        fetch_log.duration_ms = (
            elapsed_milliseconds(
                timer_started_at
            )
        )

        fetch_log.http_status_code = (
            http_status_code
        )

        fetch_log.fetched_count = (
            fetched_count
        )

        fetch_log.inserted_count = (
            inserted_count
        )

        fetch_log.skipped_count = (
            skipped_count
        )

        fetch_log.failed_count = 0

        fetch_log.error_message = None

        db.commit()

        return IngestionResult(
            source=SOURCE_NAME,
            status="success",
            fetch_log_id=fetch_log_id,
            fetched=fetched_count,
            inserted=inserted_count,
            skipped=skipped_count,
            failed=0,
        )

    except (
        NoaaSwpcClientError,
        NoaaKpParseError,
    ) as error:
        mark_fetch_log_failed(
            db=db,
            fetch_log_id=fetch_log_id,
            timer_started_at=(
                timer_started_at
            ),
            error=error,
            fetched_count=fetched_count,
            http_status_code=(
                http_status_code
                or getattr(
                    error,
                    "http_status_code",
                    None,
                )
            ),
        )

        raise NoaaIngestionExternalError(
            f"NOAA ingestion failed: {error}"
        ) from error

    except SQLAlchemyError as error:
        mark_fetch_log_failed(
            db=db,
            fetch_log_id=fetch_log_id,
            timer_started_at=(
                timer_started_at
            ),
            error=error,
            fetched_count=fetched_count,
            http_status_code=(
                http_status_code
            ),
        )

        raise NoaaIngestionDatabaseError(
            (
                "NOAA ingestion database "
                f"operation failed: {error}"
            )
        ) from error

    except Exception as error:
        mark_fetch_log_failed(
            db=db,
            fetch_log_id=fetch_log_id,
            timer_started_at=(
                timer_started_at
            ),
            error=error,
            fetched_count=fetched_count,
            http_status_code=(
                http_status_code
            ),
        )

        raise NoaaIngestionError(
            (
                "NOAA ingestion encountered "
                f"an unexpected error: {error}"
            )
        ) from error