"""
Regression tests for ingestion counter semantics.

Every source reconciles on the normalized count:

    normalized_count == inserted_count + skipped_count

fetched_count keeps its own meaning of raw source
records. The difference between the two is signed:
alerts collapse, because a reissued notification
supersedes an earlier one, while solar wind expands,
because one reading yields several measurements.
Neither is a stored duplicate.

Before this model existed, alert ingestion computed
skipped_count as fetched_count - inserted_count, which
forced the totals to reconcile and silently reported
superseded notifications as skipped duplicates.
"""

from decimal import Decimal

import pytest

from clients.noaa_swpc_client import NoaaFetchResult
from services import noaa_ingestion_service
from services.noaa_ingestion_service import (
    ingest_noaa_alerts,
    ingest_noaa_planetary_k_index,
    ingest_noaa_solar_wind,
)


KP_RECORD = {
    "time_tag": "2026-08-03T15:00:00",
    "Kp": 1.67,
    "a_running": 6,
    "station_count": 8,
}

SOLAR_WIND_RECORD = {
    "time_tag": "2026-08-26T00:39:07",
    "active": True,
    "source": "SOLAR1",
    "proton_speed": Decimal("326.42"),
    "proton_temperature": Decimal("33643"),
    "proton_density": Decimal("3.8"),
}


def alert_record(
    product_id: str,
    serial: str,
    issued: str,
) -> dict:
    """
    Build one NOAA alert payload.

    external_id is product_id:serial, so reissuing the
    same serial at a later time supersedes the earlier
    version during parsing.
    """

    return {
        "product_id": product_id,
        "issue_datetime": issued,
        "message": (
            "Space Weather Message Code: ALTEF3\r\n"
            f"Serial Number: {serial}\r\n"
            "Issue Time: 2026 Aug 24 1036 UTC\r\n"
            "\r\n"
            "ALERT: Electron 2MeV Integral Flux "
            "exceeded 1,000pfu\r\n"
        ),
    }


class FakeFetchLog:
    """
    Stands in for the ApiFetchLog ORM row.

    The real repository functions write to it, so the
    recorded counters are exercised rather than
    mocked away.
    """

    def __init__(self):
        self.id = 1
        self.status = "started"
        self.fetched_count = 0
        self.normalized_count = 0
        self.inserted_count = 0
        self.skipped_count = 0
        self.failed_count = 0
        self.error_message = None
        self.completed_at = None
        self.duration_ms = None
        self.http_status_code = None


class FakeSession:
    def __init__(self):
        self.committed = 0

    def add(self, instance):
        pass

    def commit(self):
        self.committed += 1

    def refresh(self, instance):
        pass

    def rollback(self):
        pass


class FakeClient:
    """
    Returns a fixed NOAA payload for every product.
    """

    def __init__(self, records):
        self.records = records

    def _result(self):
        return NoaaFetchResult(
            records=self.records,
            http_status_code=200,
        )

    def fetch_planetary_k_index(self):
        return self._result()

    def fetch_alerts(self):
        return self._result()

    def fetch_solar_wind(self):
        return self._result()


@pytest.fixture
def fetch_log(monkeypatch) -> FakeFetchLog:
    """
    Capture the fetch-log row the run writes to.
    """

    log = FakeFetchLog()

    monkeypatch.setattr(
        noaa_ingestion_service,
        "create_fetch_log",
        lambda **kwargs: log,
    )

    return log


def install_insert_count(
    monkeypatch,
    name: str,
    inserted: int,
) -> None:
    """
    Pretend the database accepted `inserted` of the
    submitted rows and rejected the rest as
    duplicates.
    """

    monkeypatch.setattr(
        noaa_ingestion_service,
        name,
        lambda db, values: inserted,
    )


def assert_reconciles(result, fetch_log) -> None:
    """
    The invariant, checked on both the API response
    and the persisted log row.
    """

    assert (
        result.normalized
        == result.inserted + result.skipped
    )

    assert (
        fetch_log.normalized_count
        == fetch_log.inserted_count
        + fetch_log.skipped_count
    )

    assert (
        fetch_log.normalized_count
        == result.normalized
    )

    assert fetch_log.status == "success"


# -------------------------------------------------
# Planetary K-index: one measurement per source row
# -------------------------------------------------

def test_kp_first_run(
    monkeypatch,
    fetch_log,
) -> None:
    install_insert_count(
        monkeypatch,
        "insert_measurements_ignore_duplicates",
        3,
    )

    result = ingest_noaa_planetary_k_index(
        db=FakeSession(),
        client=FakeClient([KP_RECORD] * 3),
    )

    assert result.fetched == 3
    assert result.normalized == 3
    assert result.inserted == 3
    assert result.skipped == 0

    assert_reconciles(result, fetch_log)


def test_kp_repeat_run_skips_everything(
    monkeypatch,
    fetch_log,
) -> None:
    install_insert_count(
        monkeypatch,
        "insert_measurements_ignore_duplicates",
        0,
    )

    result = ingest_noaa_planetary_k_index(
        db=FakeSession(),
        client=FakeClient([KP_RECORD] * 3),
    )

    assert result.fetched == 3
    assert result.normalized == 3
    assert result.inserted == 0
    assert result.skipped == 3

    assert_reconciles(result, fetch_log)


# -------------------------------------------------
# Alerts: source rows can collapse during parsing
# -------------------------------------------------

SUPERSEDED_FEED = [
    # Two versions of the same notification. NOAA
    # reissued serial 100, so only the later one
    # survives normalization.
    alert_record(
        "K06A",
        "100",
        "2026-08-24 10:00:00.000",
    ),
    alert_record(
        "K06A",
        "100",
        "2026-08-24 12:00:00.000",
    ),
    alert_record(
        "EF3A",
        "200",
        "2026-08-24 11:00:00.000",
    ),
]


def test_superseded_alert_is_not_counted_as_skipped(
    monkeypatch,
    fetch_log,
) -> None:
    """
    The reason this accounting model exists.

    Three source rows produce two logical alerts. The
    row that disappeared was superseded during
    parsing, not rejected by the database, so it must
    show up as the gap between fetched and normalized,
    and never as a skipped duplicate.
    """

    install_insert_count(
        monkeypatch,
        "insert_alerts_ignore_duplicates",
        2,
    )

    result = ingest_noaa_alerts(
        db=FakeSession(),
        client=FakeClient(SUPERSEDED_FEED),
    )

    assert result.fetched == 3
    assert result.normalized == 2
    assert result.inserted == 2

    # The superseded row is not a duplicate.
    assert result.skipped == 0

    assert (
        result.fetched - result.normalized == 1
    )

    assert_reconciles(result, fetch_log)


def test_alert_repeat_run_skips_normalized_rows(
    monkeypatch,
    fetch_log,
) -> None:
    """
    On a repeat run the two logical alerts are already
    stored. Skipped counts those two, not the three
    source rows.
    """

    install_insert_count(
        monkeypatch,
        "insert_alerts_ignore_duplicates",
        0,
    )

    result = ingest_noaa_alerts(
        db=FakeSession(),
        client=FakeClient(SUPERSEDED_FEED),
    )

    assert result.fetched == 3
    assert result.normalized == 2
    assert result.inserted == 0
    assert result.skipped == 2

    assert_reconciles(result, fetch_log)


# -------------------------------------------------
# Solar wind: one source row yields several metrics
# -------------------------------------------------

def test_solar_wind_first_run(
    monkeypatch,
    fetch_log,
) -> None:
    """
    Two source rows produce six measurements, so a
    successful run legitimately inserts more rows than
    it fetched. Reconciling against fetched_count
    would report a nonsensical negative skip.
    """

    install_insert_count(
        monkeypatch,
        "insert_measurements_ignore_duplicates",
        6,
    )

    result = ingest_noaa_solar_wind(
        db=FakeSession(),
        client=FakeClient(
            [SOLAR_WIND_RECORD] * 2
        ),
    )

    assert result.fetched == 2
    assert result.normalized == 6
    assert result.inserted == 6
    assert result.skipped == 0

    assert result.inserted > result.fetched

    assert_reconciles(result, fetch_log)


def test_solar_wind_repeat_run(
    monkeypatch,
    fetch_log,
) -> None:
    install_insert_count(
        monkeypatch,
        "insert_measurements_ignore_duplicates",
        0,
    )

    result = ingest_noaa_solar_wind(
        db=FakeSession(),
        client=FakeClient(
            [SOLAR_WIND_RECORD] * 2
        ),
    )

    assert result.fetched == 2
    assert result.normalized == 6
    assert result.inserted == 0
    assert result.skipped == 6

    assert_reconciles(result, fetch_log)


# -------------------------------------------------
# Failure paths
# -------------------------------------------------

def install_fetch_log_lookup(
    monkeypatch,
    log: FakeFetchLog,
) -> None:
    monkeypatch.setattr(
        noaa_ingestion_service,
        "get_fetch_log",
        lambda db, fetch_log_id: log,
    )


def test_database_failure_records_work_done(
    monkeypatch,
    fetch_log,
) -> None:
    """
    Normalization finished and the database then
    failed. The count is known, so the log should show
    how much work the run had completed rather than
    reporting zero.
    """

    from sqlalchemy.exc import SQLAlchemyError

    install_fetch_log_lookup(
        monkeypatch,
        fetch_log,
    )

    def explode(db, values):
        raise SQLAlchemyError(
            "connection lost"
        )

    monkeypatch.setattr(
        noaa_ingestion_service,
        "insert_measurements_ignore_duplicates",
        explode,
    )

    with pytest.raises(
        noaa_ingestion_service.NoaaIngestionDatabaseError
    ):
        ingest_noaa_solar_wind(
            db=FakeSession(),
            client=FakeClient(
                [SOLAR_WIND_RECORD] * 2
            ),
        )

    assert fetch_log.status == "failed"
    assert fetch_log.fetched_count == 2
    assert fetch_log.normalized_count == 6


def test_upstream_failure_records_zero_normalized(
    monkeypatch,
    fetch_log,
) -> None:
    """
    The run failed before parsing, so zero is the
    honest value.
    """

    from clients.noaa_swpc_client import (
        NoaaSwpcClientError,
    )

    install_fetch_log_lookup(
        monkeypatch,
        fetch_log,
    )

    class DeadClient:
        def fetch_solar_wind(self):
            raise NoaaSwpcClientError(
                message="NOAA unreachable",
                http_status_code=None,
            )

    with pytest.raises(
        noaa_ingestion_service.NoaaIngestionExternalError
    ):
        ingest_noaa_solar_wind(
            db=FakeSession(),
            client=DeadClient(),
        )

    assert fetch_log.status == "failed"
    assert fetch_log.normalized_count == 0
