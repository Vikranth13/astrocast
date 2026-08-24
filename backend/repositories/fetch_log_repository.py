from datetime import datetime

from sqlalchemy.orm import Session

from models.api_fetch_log import ApiFetchLog


def create_fetch_log(
    db: Session,
    source: str,
    endpoint: str,
    started_at: datetime,
) -> ApiFetchLog:
    fetch_log = ApiFetchLog(
        source=source,
        endpoint=endpoint,
        status="started",
        started_at=started_at,
    )

    db.add(fetch_log)

    return fetch_log


def get_fetch_log(
    db: Session,
    fetch_log_id: int,
) -> ApiFetchLog | None:
    return db.get(
        ApiFetchLog,
        fetch_log_id,
    )


def mark_fetch_log_success(
    fetch_log: ApiFetchLog,
    completed_at: datetime,
    duration_ms: int,
    http_status_code: int | None,
    fetched_count: int,
    inserted_count: int,
    skipped_count: int,
) -> None:
    fetch_log.status = "success"
    fetch_log.completed_at = completed_at
    fetch_log.duration_ms = duration_ms
    fetch_log.http_status_code = http_status_code
    fetch_log.fetched_count = fetched_count
    fetch_log.inserted_count = inserted_count
    fetch_log.skipped_count = skipped_count
    fetch_log.failed_count = 0
    fetch_log.error_message = None


def mark_fetch_log_failure(
    fetch_log: ApiFetchLog,
    completed_at: datetime,
    duration_ms: int,
    http_status_code: int | None,
    fetched_count: int,
    error_message: str,
) -> None:
    fetch_log.status = "failed"
    fetch_log.completed_at = completed_at
    fetch_log.duration_ms = duration_ms
    fetch_log.http_status_code = http_status_code
    fetch_log.fetched_count = fetched_count
    fetch_log.inserted_count = 0
    fetch_log.skipped_count = 0
    fetch_log.failed_count = fetched_count
    fetch_log.error_message = error_message