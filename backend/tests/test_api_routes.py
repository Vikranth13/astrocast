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