from datetime import datetime, timezone
from time import perf_counter

# from sqlalchemy.dialects.postgresql import (
#     insert as postgresql_insert,
# )
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from clients.noaa_swpc_client import (
    NoaaSwpcClient,
    NoaaSwpcClientError,
)
from config import settings
# from models.api_fetch_log import ApiFetchLog
# from models.space_weather_measurement import (
#     SpaceWeatherMeasurement,
# )
from parsers.noaa_kp_parser import (
    NoaaKpParseError,
    parse_noaa_planetary_k_index,
)
from schemas.ingestion import IngestionResult

from repositories.fetch_log_repository import (
    create_fetch_log,
    get_fetch_log,
    mark_fetch_log_failure,
    mark_fetch_log_success,
)
from repositories.space_weather_repository import (
    insert_measurements_ignore_duplicates,
)

from parsers.noaa_alert_parser import (
    NoaaAlertParseError,
    parse_noaa_alerts,
)
from repositories.space_weather_alert_repository import (
    insert_alerts_ignore_duplicates,
)

from parsers.noaa_solar_wind_parser import (
    NoaaSolarWindParseError,
    parse_noaa_solar_wind,
)

SOURCE_NAME = "NOAA_SWPC"

# MEASUREMENT_UNIQUE_CONSTRAINT = (
#     "uq_space_weather_measurements_"
#     "source_dedup_key"
# )

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
    normalized_count: int = 0,
) -> None:
    """
    Roll back pending work and mark an existing
    fetch-log record as failed.

    Callers pass normalized_count when normalization
    had already finished, so a database failure still
    records how many records the run had produced.
    """

    db.rollback()

    try:
        fetch_log = get_fetch_log(
            db,
            fetch_log_id,
        )

        if fetch_log is None:
            return

        mark_fetch_log_failure(
            fetch_log=fetch_log,
            completed_at=utc_now(),
            duration_ms=elapsed_milliseconds(
                timer_started_at
            ),
            http_status_code=http_status_code,
            fetched_count=fetched_count,
            normalized_count=normalized_count,
            error_message=str(error)[
                :ERROR_MESSAGE_LIMIT
            ],
        )

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

    fetch_log = create_fetch_log(
        db=db,
        source=SOURCE_NAME,
        endpoint=(
            settings.noaa_planetary_k_index_url
        ),
        started_at=utc_now(),
    )

    try:
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
    normalized_count = 0

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

        normalized_count = len(
            normalized_records
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

        inserted_count = (
            insert_measurements_ignore_duplicates(
                db=db,
                values=values_to_insert,
            )
        )

        skipped_count = (
            normalized_count
            - inserted_count
        )

        mark_fetch_log_success(
            fetch_log=fetch_log,
            completed_at=utc_now(),
            duration_ms=elapsed_milliseconds(
                timer_started_at
            ),
            http_status_code=http_status_code,
            fetched_count=fetched_count,
            normalized_count=normalized_count,
            inserted_count=inserted_count,
            skipped_count=skipped_count,
        )

        db.commit()

        return IngestionResult(
            source=SOURCE_NAME,
            status="success",
            fetch_log_id=fetch_log_id,
            fetched=fetched_count,
            normalized=normalized_count,
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
            normalized_count=normalized_count,
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
            normalized_count=normalized_count,
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
            normalized_count=normalized_count,
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

def ingest_noaa_alerts(
    db: Session,
    client: NoaaSwpcClient | None = None,
) -> IngestionResult:
    """
    Fetch, validate, normalize, deduplicate,
    and store NOAA SWPC alerts.
    """

    timer_started_at = perf_counter()

    fetch_log = create_fetch_log(
        db=db,
        source=SOURCE_NAME,
        endpoint=settings.noaa_alerts_url,
        started_at=utc_now(),
    )

    try:
        db.commit()
        db.refresh(fetch_log)

    except SQLAlchemyError as error:
        db.rollback()

        raise NoaaIngestionDatabaseError(
            (
                "NOAA alert ingestion could not "
                "create the initial fetch log: "
                f"{error}"
            )
        ) from error

    fetch_log_id = fetch_log.id

    fetched_count = 0
    normalized_count = 0
    http_status_code: int | None = None

    try:
        active_client = (
            client or NoaaSwpcClient()
        )

        fetch_result = (
            active_client.fetch_alerts()
        )

        http_status_code = (
            fetch_result.http_status_code
        )

        fetched_count = len(
            fetch_result.records
        )

        normalized_records = (
            parse_noaa_alerts(
                fetch_result.records
            )
        )

        normalized_count = len(
            normalized_records
        )

        values_to_insert = [
            {
                "source": record.source,
                "external_id": (
                    record.external_id
                ),
                "deduplication_key": (
                    record.deduplication_key
                ),
                "alert_type": (
                    record.alert_type
                ),
                "severity": (
                    record.severity
                ),
                "issued_at": (
                    record.issued_at
                ),
                "expires_at": (
                    record.expires_at
                ),
                "summary": (
                    record.summary
                ),
                "raw_payload": (
                    record.raw_payload
                ),
            }
            for record in normalized_records
        ]

        inserted_count = (
            insert_alerts_ignore_duplicates(
                db=db,
                values=values_to_insert,
            )
        )

        skipped_count = (
            normalized_count
            - inserted_count
        )

        mark_fetch_log_success(
            fetch_log=fetch_log,
            completed_at=utc_now(),
            duration_ms=elapsed_milliseconds(
                timer_started_at
            ),
            http_status_code=http_status_code,
            fetched_count=fetched_count,
            normalized_count=normalized_count,
            inserted_count=inserted_count,
            skipped_count=skipped_count,
        )

        db.commit()

        return IngestionResult(
            source=SOURCE_NAME,
            status="success",
            fetch_log_id=fetch_log_id,
            fetched=fetched_count,
            normalized=normalized_count,
            inserted=inserted_count,
            skipped=skipped_count,
            failed=0,
        )

    except (
        NoaaSwpcClientError,
        NoaaAlertParseError,
    ) as error:
        mark_fetch_log_failed(
            db=db,
            fetch_log_id=fetch_log_id,
            timer_started_at=(
                timer_started_at
            ),
            error=error,
            fetched_count=fetched_count,
            normalized_count=normalized_count,
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
            (
                "NOAA alert ingestion failed: "
                f"{error}"
            )
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
            normalized_count=normalized_count,
            http_status_code=(
                http_status_code
            ),
        )

        raise NoaaIngestionDatabaseError(
            (
                "NOAA alert ingestion database "
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
            normalized_count=normalized_count,
            http_status_code=(
                http_status_code
            ),
        )

        raise NoaaIngestionError(
            (
                "NOAA alert ingestion "
                "encountered an unexpected "
                f"error: {error}"
            )
        ) from error

def ingest_noaa_solar_wind(
    db: Session,
    client: NoaaSwpcClient | None = None,
) -> IngestionResult:
    """
    Fetch, normalize, deduplicate, and persist
    active NOAA real-time solar-wind data.
    """

    timer_started_at = perf_counter()

    fetch_log = create_fetch_log(
        db=db,
        source=SOURCE_NAME,
        endpoint=settings.noaa_solar_wind_url,
        started_at=utc_now(),
    )

    try:
        db.commit()
        db.refresh(fetch_log)

    except SQLAlchemyError as error:
        db.rollback()

        raise NoaaIngestionDatabaseError(
            (
                "NOAA solar-wind ingestion "
                "could not create the initial "
                f"fetch log: {error}"
            )
        ) from error

    fetch_log_id = fetch_log.id
    fetched_count = 0
    normalized_count = 0
    http_status_code: int | None = None

    try:
        active_client = (
            client or NoaaSwpcClient()
        )

        fetch_result = (
            active_client.fetch_solar_wind()
        )

        http_status_code = (
            fetch_result.http_status_code
        )

        fetched_count = len(
            fetch_result.records
        )

        normalized_records = (
            parse_noaa_solar_wind(
                fetch_result.records
            )
        )

        normalized_count = len(
            normalized_records
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

        inserted_count = (
            insert_measurements_ignore_duplicates(
                db=db,
                values=values_to_insert,
            )
        )

        skipped_count = (
            normalized_count
            - inserted_count
        )

        mark_fetch_log_success(
            fetch_log=fetch_log,
            completed_at=utc_now(),
            duration_ms=elapsed_milliseconds(
                timer_started_at
            ),
            http_status_code=http_status_code,
            fetched_count=fetched_count,
            normalized_count=normalized_count,
            inserted_count=inserted_count,
            skipped_count=skipped_count,
        )

        db.commit()

        return IngestionResult(
            source=SOURCE_NAME,
            status="success",
            fetch_log_id=fetch_log_id,
            fetched=fetched_count,
            normalized=normalized_count,
            inserted=inserted_count,
            skipped=skipped_count,
            failed=0,
        )

    except (
        NoaaSwpcClientError,
        NoaaSolarWindParseError,
    ) as error:
        mark_fetch_log_failed(
            db=db,
            fetch_log_id=fetch_log_id,
            timer_started_at=(
                timer_started_at
            ),
            error=error,
            fetched_count=fetched_count,
            normalized_count=normalized_count,
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
            (
                "NOAA solar-wind ingestion "
                f"failed: {error}"
            )
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
            normalized_count=normalized_count,
            http_status_code=(
                http_status_code
            ),
        )

        raise NoaaIngestionDatabaseError(
            (
                "NOAA solar-wind database "
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
            normalized_count=normalized_count,
            http_status_code=(
                http_status_code
            ),
        )

        raise NoaaIngestionError(
            (
                "NOAA solar-wind ingestion "
                "encountered an unexpected "
                f"error: {error}"
            )
        ) from error