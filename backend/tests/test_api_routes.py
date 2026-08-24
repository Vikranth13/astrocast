from api.routes import (
    admin_ingestion,
    space_weather,
    system,
)

from datetime import (
    datetime,
    timezone,
)

import pytest
from fastapi.testclient import TestClient

import main
from database import get_db
from schemas.ingestion import (
    IngestionResult,
)
from schemas.space_weather import (
    CurrentSpaceWeatherResponse,
    GeomagneticActivity,
    PlanetaryKpFacts,
    SpaceWeatherAlertListResponse,
    SpaceWeatherAlertResponse,
    SpaceWeatherFreshness,
)
from services.noaa_ingestion_service import (
    NoaaIngestionExternalError,
)


def override_get_db():
    """
    Supply a harmless fake database object.

    Route functions are patched so this object
    is never used as a real SQLAlchemy Session.
    """

    yield object()


@pytest.fixture(autouse=True)
def install_database_override():
    main.app.dependency_overrides[
        get_db
    ] = override_get_db

    yield

    main.app.dependency_overrides.clear()


client = TestClient(main.app)


def test_health_route(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        system,
        "database_is_available",
        lambda: True,
    )

    response = client.get("/health")

    assert response.status_code == 200

    assert response.json() == {
        "status": "ok",
        "database": "ok",
    }


def test_current_space_weather_route(
    monkeypatch,
) -> None:
    expected_response = (
        CurrentSpaceWeatherResponse(
            source="NOAA_SWPC",
            metric_name=(
                "planetary_k_index"
            ),
            observed_at=datetime(
                2026,
                8,
                3,
                15,
                0,
                tzinfo=timezone.utc,
            ),
            ingested_at=datetime(
                2026,
                8,
                3,
                18,
                30,
                tzinfo=timezone.utc,
            ),
            freshness=(
                SpaceWeatherFreshness(
                    status="current",
                    age_minutes=180,
                )
            ),
            geomagnetic_activity=(
                GeomagneticActivity(
                    level="below_storm",
                    label=(
                        "Below geomagnetic "
                        "storm level"
                    ),
                    noaa_scale=None,
                    is_storm=False,
                )
            ),
            facts=PlanetaryKpFacts(
                kp=1.67,
                a_running=6,
                station_count=8,
            ),
            explanation=(
                "Test explanation."
            ),
        )
    )

    monkeypatch.setattr(
        space_weather,
        "get_current_space_weather",
        lambda db: expected_response,
    )

    response = client.get(
        "/api/space-weather/current"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["source"] == "NOAA_SWPC"

    assert (
        body["facts"]["kp"]
        == 1.67
    )

    assert (
        body["facts"]["station_count"]
        == 8
    )

    assert (
        body["geomagnetic_activity"][
            "level"
        ]
        == "below_storm"
    )


def test_ingestion_route_returns_summary(
    monkeypatch,
) -> None:
    expected_result = IngestionResult(
        source="NOAA_SWPC",
        status="success",
        fetch_log_id=10,
        fetched=62,
        inserted=0,
        skipped=62,
        failed=0,
    )

    monkeypatch.setattr(
        admin_ingestion,
        "ingest_noaa_planetary_k_index",
        lambda db: expected_result,
    )

    response = client.post(
        "/api/admin/ingestion/noaa"
    )

    assert response.status_code == 200

    assert response.json() == {
        "source": "NOAA_SWPC",
        "status": "success",
        "fetch_log_id": 10,
        "fetched": 62,
        "inserted": 0,
        "skipped": 62,
        "failed": 0,
    }


def test_ingestion_route_maps_external_error_to_502(
    monkeypatch,
) -> None:
    def raise_external_error(
        db,
    ):
        raise NoaaIngestionExternalError(
            "NOAA is unavailable."
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

    assert response.json() == {
        "detail": "NOAA is unavailable."
    }

def test_alert_list_route(
    monkeypatch,
) -> None:
    expected_alert = (
        SpaceWeatherAlertResponse(
            id=11,
            source="NOAA_SWPC",
            external_id="K05A:2047",
            alert_type="warning",
            severity="G1",
            issued_at=datetime(
                2026,
                8,
                19,
                5,
                45,
                tzinfo=timezone.utc,
            ),
            expires_at=None,
            status="unknown",
            summary=(
                "ALERT: Geomagnetic "
                "K-index of 5"
            ),
            ingested_at=datetime(
                2026,
                8,
                24,
                21,
                21,
                tzinfo=timezone.utc,
            ),
        )
    )

    expected_response = (
        SpaceWeatherAlertListResponse(
            count=1,
            alerts=[
                expected_alert
            ],
        )
    )

    captured = {}

    def fake_get_alerts(
        db,
        severity=None,
        alert_type=None,
        source=None,
        issued_start=None,
        issued_end=None,
        status=None,
        limit=100,
    ):
        captured["severity"] = severity
        captured["alert_type"] = (
            alert_type
        )
        captured["source"] = source
        captured["status"] = status
        captured["limit"] = limit

        return expected_response

    monkeypatch.setattr(
        space_weather,
        "get_space_weather_alerts",
        fake_get_alerts,
    )

    response = client.get(
        (
            "/api/space-weather/alerts"
            "?severity=G1"
            "&type=warning"
            "&source=NOAA_SWPC"
            "&status=unknown"
            "&limit=5"
        )
    )

    assert response.status_code == 200

    body = response.json()

    assert body["count"] == 1

    assert (
        body["alerts"][0]["severity"]
        == "G1"
    )

    assert (
        captured["severity"]
        == "G1"
    )

    assert (
        captured["alert_type"]
        == "warning"
    )

    assert (
        captured["source"]
        == "NOAA_SWPC"
    )

    assert (
        captured["status"]
        == "unknown"
    )

    assert captured["limit"] == 5

@pytest.mark.parametrize(
    "query",
    [
        "?type=garbage",
        "?status=banana",
        "?severity=G9",
        "?source=OTHER",
        "?limit=0",
        "?limit=501",
    ],
)
def test_alert_list_rejects_invalid_filters(
    query,
) -> None:
    response = client.get(
        (
            "/api/space-weather/alerts"
            f"{query}"
        )
    )

    assert response.status_code == 422

def test_alert_detail_route(
    monkeypatch,
) -> None:
    expected_response = (
        SpaceWeatherAlertResponse(
            id=1,
            source="NOAA_SWPC",
            external_id="EF3A:3727",
            alert_type="alert",
            severity=None,
            issued_at=datetime(
                2026,
                8,
                24,
                10,
                36,
                tzinfo=timezone.utc,
            ),
            expires_at=None,
            status="unknown",
            summary=(
                "CONTINUED ALERT: "
                "Electron flux exceeded"
            ),
            ingested_at=datetime(
                2026,
                8,
                24,
                21,
                21,
                tzinfo=timezone.utc,
            ),
        )
    )

    monkeypatch.setattr(
        space_weather,
        "get_space_weather_alert",
        lambda db, alert_id: (
            expected_response
        ),
    )

    response = client.get(
        "/api/space-weather/alerts/1"
    )

    assert response.status_code == 200

    assert response.json()["id"] == 1

    assert (
        response.json()["external_id"]
        == "EF3A:3727"
    )

def test_alert_ingestion_route_returns_summary(
    monkeypatch,
) -> None:
    expected_result = IngestionResult(
        source="NOAA_SWPC",
        status="success",
        fetch_log_id=20,
        fetched=77,
        inserted=0,
        skipped=77,
        failed=0,
    )

    monkeypatch.setattr(
        admin_ingestion,
        "ingest_noaa_alerts",
        lambda db: expected_result,
    )

    response = client.post(
        "/api/admin/ingestion/noaa/alerts"
    )

    assert response.status_code == 200

    assert response.json() == {
        "source": "NOAA_SWPC",
        "status": "success",
        "fetch_log_id": 20,
        "fetched": 77,
        "inserted": 0,
        "skipped": 77,
        "failed": 0,
    }