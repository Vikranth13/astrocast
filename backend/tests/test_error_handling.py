"""
Tests for the global error contract and for outage
resilience.

Two guarantees matter here:

1. Every failure, wherever it is raised, reaches the
   client in the same envelope, and internal detail
   never leaks.
2. Endpoints that read stored data keep working while
   NOAA is unreachable.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
import requests
from fastapi import HTTPException
from fastapi.testclient import TestClient

import main
from api.routes import space_weather
from clients.noaa_swpc_client import (
    NoaaSwpcClient,
    NoaaSwpcClientError,
)
from database import get_db
from services.noaa_ingestion_service import (
    NoaaIngestionDatabaseError,
    NoaaIngestionExternalError,
)
from api.routes import admin_ingestion


def override_get_db():
    yield object()


@pytest.fixture(autouse=True)
def install_database_override():
    main.app.dependency_overrides[
        get_db
    ] = override_get_db

    yield

    main.app.dependency_overrides.clear()


client = TestClient(main.app)

# Lets the unhandled-exception path be observed
# instead of being re-raised into the test.
unsafe_client = TestClient(
    main.app,
    raise_server_exceptions=False,
)


def assert_error_envelope(
    body: dict,
    expected_code: str,
) -> None:
    assert set(body) == {"error"}

    error = body["error"]

    assert set(error) == {
        "code",
        "message",
        "details",
    }

    assert error["code"] == expected_code
    assert isinstance(error["message"], str)
    assert len(error["message"]) > 0


# -------------------------------------------------
# Envelope shape
# -------------------------------------------------

def test_not_found_uses_the_standard_envelope(
    monkeypatch,
) -> None:
    def raise_not_found(db, alert_id):
        raise HTTPException(
            status_code=404,
            detail=(
                "Space-weather alert was not found."
            ),
        )

    monkeypatch.setattr(
        space_weather,
        "get_space_weather_alert",
        raise_not_found,
    )

    response = client.get(
        "/api/space-weather/alerts/999999"
    )

    assert response.status_code == 404

    assert_error_envelope(
        response.json(),
        "not_found",
    )


def test_unknown_route_uses_the_envelope(
) -> None:
    response = client.get(
        "/api/space-weather/does-not-exist"
    )

    assert response.status_code == 404

    assert_error_envelope(
        response.json(),
        "not_found",
    )


def test_validation_error_reports_the_field(
) -> None:
    response = client.get(
        "/api/space-weather/alerts"
        "?severity=NOT_A_SEVERITY"
    )

    assert response.status_code == 422

    body = response.json()

    assert_error_envelope(
        body,
        "validation_error",
    )

    details = body["error"]["details"]

    assert isinstance(details, list)
    assert len(details) > 0

    assert any(
        "severity" in str(item.get("loc", ""))
        for item in details
    )


# -------------------------------------------------
# Internal failures must not leak
# -------------------------------------------------

def test_unexpected_error_is_opaque_to_the_client(
    monkeypatch,
) -> None:
    """
    An unexpected exception must not expose its
    message, its type, or a traceback.
    """

    secret = "SECRET_CONNECTION_STRING"

    def raise_unexpected(db):
        raise RuntimeError(secret)

    monkeypatch.setattr(
        space_weather,
        "get_current_space_weather",
        raise_unexpected,
    )

    response = unsafe_client.get(
        "/api/space-weather/current"
    )

    assert response.status_code == 500

    body = response.json()

    assert_error_envelope(
        body,
        "internal_error",
    )

    serialized = response.text

    assert secret not in serialized
    assert "RuntimeError" not in serialized
    assert "Traceback" not in serialized


def test_noaa_client_error_becomes_502(
    monkeypatch,
) -> None:
    def raise_client_error(db):
        raise NoaaSwpcClientError(
            message="NOAA refused the request.",
            http_status_code=503,
        )

    monkeypatch.setattr(
        space_weather,
        "get_current_space_weather",
        raise_client_error,
    )

    response = client.get(
        "/api/space-weather/current"
    )

    assert response.status_code == 502

    assert_error_envelope(
        response.json(),
        "upstream_unavailable",
    )


def test_ingestion_upstream_error_hides_internals(
    monkeypatch,
) -> None:
    """
    A connection failure carries the internal host,
    port, and a library object repr. None of that may
    reach an unauthenticated endpoint.
    """

    def raise_external_error(db):
        raise NoaaIngestionExternalError(
            "NOAA ingestion failed: "
            "HTTPConnectionPool(host='10.0.0.7', "
            "port=9): Max retries exceeded "
            "(Caused by NewConnectionError("
            "'<urllib3.connection.HTTPConnection "
            "object at 0x000001EEED8C7080>'))"
        )

    monkeypatch.setattr(
        admin_ingestion,
        "ingest_noaa_planetary_k_index",
        raise_external_error,
    )

    response = client.post(
        "/api/admin/ingestion/noaa"
    )

    assert response.status_code == 502

    assert_error_envelope(
        response.json(),
        "upstream_unavailable",
    )

    serialized = response.text

    assert "10.0.0.7" not in serialized
    assert "urllib3" not in serialized
    assert "0x0000" not in serialized
    assert "HTTPConnectionPool" not in serialized


def test_ingestion_database_error_becomes_500(
    monkeypatch,
) -> None:
    def raise_database_error(db):
        raise NoaaIngestionDatabaseError(
            "Could not store measurements."
        )

    monkeypatch.setattr(
        admin_ingestion,
        "ingest_noaa_planetary_k_index",
        raise_database_error,
    )

    response = client.post(
        "/api/admin/ingestion/noaa"
    )

    assert response.status_code == 500

    assert_error_envelope(
        response.json(),
        "database_error",
    )


# -------------------------------------------------
# Outage resilience
#
# The Week 3 definition of done requires stored data
# to remain available when an external API fails.
#
# These tests do not stub the service layer. They run
# the real services against a fake database while the
# network itself is dead, so a read endpoint that
# secretly called NOAA would fail loudly.
# -------------------------------------------------

class FakeScalarResult:
    def __init__(self, rows):
        self.rows = rows

    def first(self):
        return (
            self.rows[0]
            if self.rows
            else None
        )

    def all(self):
        return self.rows


class StoredDataSession:
    """
    A database that already holds ingested NOAA data.
    """

    def __init__(self, rows):
        self.rows = rows

    def scalars(self, statement):
        return FakeScalarResult(self.rows)


def stored_kp_measurement():
    now = datetime.now(timezone.utc)

    return SimpleNamespace(
        source="NOAA_SWPC",
        metric_name="planetary_k_index",
        observed_at=now - timedelta(minutes=30),
        numeric_value=Decimal("1.67"),
        unit="index",
        station=None,
        created_at=now - timedelta(minutes=20),
        raw_payload={
            "Kp": 1.67,
            "a_running": 6,
            "station_count": 8,
        },
    )


@pytest.fixture
def noaa_is_unreachable(monkeypatch):
    """
    Break outbound HTTP entirely.
    """

    def refuse(*args, **kwargs):
        raise requests.ConnectionError(
            "NOAA is unreachable"
        )

    monkeypatch.setattr(
        requests.Session,
        "get",
        refuse,
    )


@pytest.fixture
def stored_data_client(noaa_is_unreachable):
    """
    A client whose database holds stored NOAA data and
    whose network is down.
    """

    rows = [stored_kp_measurement()]

    def override():
        yield StoredDataSession(rows)

    main.app.dependency_overrides[
        get_db
    ] = override

    yield TestClient(main.app)

    main.app.dependency_overrides.clear()


def test_current_still_served_during_outage(
    stored_data_client,
) -> None:
    response = stored_data_client.get(
        "/api/space-weather/current"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["facts"]["kp"] == 1.67

    assert (
        body["explanation_detail"]["summary"]
    )


def test_kp_trend_still_served_during_outage(
    stored_data_client,
) -> None:
    response = stored_data_client.get(
        "/api/space-weather/trends/kp"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["count"] == 1
    assert body["points"][0]["value"] == 1.67


def test_risk_still_served_during_outage(
    stored_data_client,
) -> None:
    response = stored_data_client.get(
        "/api/space-weather/risk"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["risk"]["level"] == "low"

    assert (
        body["explanation"]["summary"]
    )


def test_outage_fixture_really_breaks_the_network(
    noaa_is_unreachable,
) -> None:
    """
    Control for the tests above.

    If this ever stops raising, the outage fixture has
    stopped working and the resilience tests would
    pass for the wrong reason.
    """

    noaa = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://services.swpc.noaa.gov/test"
        ),
        max_retries=0,
        sleep=lambda seconds: None,
    )

    with pytest.raises(
        NoaaSwpcClientError
    ):
        noaa.fetch_planetary_k_index()
