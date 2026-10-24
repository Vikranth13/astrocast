"""
Tests for the forecast search history.

Three guarantees matter here:

1. At most one snapshot per place, forecast hour, and hour of checking.
   A repeat check within the hour refreshes the latest snapshot.
2. Saving history can never cost the user their forecast. A database
   failure is rolled back, logged, and reported as no location id.
3. The history endpoints report an unreachable database as 503 and an
   unknown place as 404.

Repository functions are replaced with fakes, so no test needs a
database. The SQL tests compile the statements instead of running them.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import OperationalError

import main
from repositories.forecast_snapshot_repository import (
    list_latest_snapshot_per_location,
)
from repositories.location_repository import (
    upsert_location,
)
from services import forecast_history_service
from services.forecast_history_service import (
    SNAPSHOT_REFRESH_WINDOW,
    build_snapshot_values,
    get_forecast_history,
    get_forecast_with_history,
    get_recent_searches,
    record_forecast,
)


client = TestClient(main.app)


NOW = datetime(
    2026,
    10,
    23,
    20,
    0,
    tzinfo=timezone.utc,
)

FORECAST = {
    "location": {
        "name": "Paris",
        "region": "Ile-de-France",
        "country": "France",
        "latitude": 48.85341,
        "longitude": 2.3488,
        "timezone": "Europe/Paris",
    },
    "forecast_time": "2026-10-23T22:00",
    "conditions": {},
    "stargazing": {
        "score": 81,
        "rating": "Excellent",
        "explanation": "Tonight looks excellent.",
        "limiting_factor": None,
        "factors": [],
    },
    "hourly": [],
    "best_window": {
        "first_hour": "2026-10-23T21:00",
        "last_hour": "2026-10-24T03:00",
        "hour_count": 7,
        "peak_time": "2026-10-24T01:00",
        "peak_score": 90,
        "peak_rating": "Excellent",
        "qualifies": True,
    },
}


def database_down(*args, **kwargs):
    raise OperationalError(
        "statement",
        None,
        ConnectionError("database is down"),
    )


class FakeSession:
    """
    Counts commits and rollbacks.
    """

    def __init__(self):
        self.commits = 0
        self.rollbacks = 0

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


def install_repositories(
    monkeypatch,
    latest_retrieved_at: datetime | None,
) -> dict:
    """
    Replace the repository calls record_forecast makes, recording what
    it asks them to do.
    """

    calls = {
        "added": [],
        "refreshed": [],
    }

    monkeypatch.setattr(
        forecast_history_service,
        "upsert_location",
        lambda **kwargs: 7,
    )

    latest = (
        SimpleNamespace(
            retrieved_at=latest_retrieved_at,
        )
        if latest_retrieved_at is not None
        else None
    )

    monkeypatch.setattr(
        forecast_history_service,
        "get_latest_snapshot",
        lambda **kwargs: latest,
    )

    monkeypatch.setattr(
        forecast_history_service,
        "add_snapshot",
        lambda db, values: calls["added"].append(values),
    )

    monkeypatch.setattr(
        forecast_history_service,
        "refresh_snapshot",
        lambda snapshot, values: calls["refreshed"].append(values),
    )

    return calls


# ---------------------------------------------------------------
# Saving rule
# ---------------------------------------------------------------

def test_a_first_check_adds_a_snapshot(
    monkeypatch,
) -> None:
    calls = install_repositories(
        monkeypatch,
        latest_retrieved_at=None,
    )

    db = FakeSession()

    location_id = record_forecast(
        db,
        FORECAST,
        now=NOW,
    )

    assert location_id == 7
    assert db.commits == 1

    assert len(calls["added"]) == 1
    assert calls["added"][0]["location_id"] == 7
    assert calls["refreshed"] == []


def test_a_repeat_check_within_the_hour_refreshes_the_snapshot(
    monkeypatch,
) -> None:
    calls = install_repositories(
        monkeypatch,
        latest_retrieved_at=NOW - timedelta(minutes=30),
    )

    record_forecast(
        FakeSession(),
        FORECAST,
        now=NOW,
    )

    assert calls["added"] == []
    assert len(calls["refreshed"]) == 1
    assert calls["refreshed"][0]["retrieved_at"] == NOW


@pytest.mark.parametrize(
    "age",
    [
        SNAPSHOT_REFRESH_WINDOW,
        SNAPSHOT_REFRESH_WINDOW + timedelta(minutes=1),
    ],
)
def test_a_check_an_hour_or_more_later_adds_a_new_snapshot(
    monkeypatch,
    age: timedelta,
) -> None:
    calls = install_repositories(
        monkeypatch,
        latest_retrieved_at=NOW - age,
    )

    record_forecast(
        FakeSession(),
        FORECAST,
        now=NOW,
    )

    assert len(calls["added"]) == 1
    assert calls["refreshed"] == []


def test_a_database_failure_costs_nothing_but_the_history(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        forecast_history_service,
        "upsert_location",
        database_down,
    )

    db = FakeSession()

    assert record_forecast(
        db,
        FORECAST,
        now=NOW,
    ) is None

    assert db.rollbacks == 1
    assert db.commits == 0


def test_snapshot_values_keep_what_the_history_shows() -> None:
    values = build_snapshot_values(
        FORECAST,
        NOW,
    )

    assert values["retrieved_at"] == NOW
    assert values["forecast_time"] == "2026-10-23T22:00"
    assert values["score"] == 81
    assert values["rating"] == "Excellent"
    assert values["limiting_factor"] is None
    assert values["best_window_first_hour"] == "2026-10-23T21:00"
    assert values["best_window_qualifies"] is True

    # The full forecast is kept exactly as it was returned.
    assert values["response"] == FORECAST


def test_snapshot_values_without_a_best_window() -> None:
    values = build_snapshot_values(
        {
            **FORECAST,
            "best_window": None,
        },
        NOW,
    )

    assert values["best_window_first_hour"] is None
    assert values["best_window_last_hour"] is None
    assert values["best_window_qualifies"] is None


def test_the_forecast_carries_its_location_id(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        forecast_history_service,
        "get_forecast_for_city",
        lambda city: FORECAST,
    )

    monkeypatch.setattr(
        forecast_history_service,
        "record_forecast",
        lambda db, forecast: 7,
    )

    forecast = get_forecast_with_history(
        db=FakeSession(),
        city="Paris",
    )

    assert forecast["location_id"] == 7
    assert forecast["stargazing"]["score"] == 81


# ---------------------------------------------------------------
# Reading the history
# ---------------------------------------------------------------

def stored_location() -> SimpleNamespace:
    return SimpleNamespace(
        id=7,
        name="Paris",
        region="Ile-de-France",
        country="France",
        latitude=Decimal("48.853410"),
        longitude=Decimal("2.348800"),
        timezone="Europe/Paris",
    )


def stored_snapshot(
    retrieved_at: datetime,
    score: int,
) -> SimpleNamespace:
    return SimpleNamespace(
        retrieved_at=retrieved_at,
        forecast_time="2026-10-23T22:00",
        score=score,
        rating="Excellent" if score >= 80 else "Good",
        limiting_factor=None,
        best_window_first_hour=None,
        best_window_last_hour=None,
        best_window_qualifies=None,
    )


def test_recent_searches_pair_each_place_with_its_latest_check(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        forecast_history_service,
        "list_latest_snapshot_per_location",
        lambda db, limit: [
            (
                stored_location(),
                stored_snapshot(NOW, 81),
            ),
        ],
    )

    response = get_recent_searches(
        db=FakeSession(),
        limit=5,
    )

    assert response.count == 1

    search = response.searches[0]

    assert search.location.id == 7
    assert search.location.latitude == 48.85341
    assert search.latest.score == 81
    assert search.latest.retrieved_at == NOW


def test_recent_searches_report_an_unreachable_database_as_503(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        forecast_history_service,
        "list_latest_snapshot_per_location",
        database_down,
    )

    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_recent_searches(
            db=FakeSession(),
            limit=5,
        )

    assert captured_error.value.status_code == 503


def test_history_lists_a_places_checks_newest_first(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        forecast_history_service,
        "get_location_by_id",
        lambda db, location_id: stored_location(),
    )

    monkeypatch.setattr(
        forecast_history_service,
        "list_snapshots",
        lambda db, location_id, limit: [
            stored_snapshot(NOW, 81),
            stored_snapshot(NOW - timedelta(hours=2), 74),
        ],
    )

    response = get_forecast_history(
        db=FakeSession(),
        location_id=7,
        limit=10,
    )

    assert response.location.name == "Paris"
    assert response.count == 2

    assert [
        snapshot.score
        for snapshot in response.snapshots
    ] == [81, 74]


def test_history_for_an_unknown_place_is_404(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        forecast_history_service,
        "get_location_by_id",
        lambda db, location_id: None,
    )

    with pytest.raises(
        HTTPException
    ) as captured_error:
        get_forecast_history(
            db=FakeSession(),
            location_id=999,
            limit=10,
        )

    assert captured_error.value.status_code == 404


# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------

@pytest.mark.parametrize(
    "path",
    [
        "/api/locations/recent?limit=0",
        "/api/locations/recent?limit=21",
        "/api/locations/7/forecasts?limit=0",
        "/api/locations/7/forecasts?limit=51",
        "/api/locations/paris/forecasts",
    ],
)
def test_history_routes_validate_their_parameters(
    path: str,
) -> None:
    response = client.get(path)

    assert response.status_code == 422


def test_recent_searches_route_without_a_database_is_503() -> None:
    """
    The shared test setup gives the route a session that cannot reach
    a database, which is exactly the outage this checks.
    """

    response = client.get(
        "/api/locations/recent"
    )

    assert response.status_code == 503

    error = response.json()["error"]

    assert error["code"] == "service_unavailable"
    assert "database could not be reached" in error["message"]


# ---------------------------------------------------------------
# SQL
# ---------------------------------------------------------------

class CapturingSession:
    def __init__(self):
        self.statement = None

    def execute(self, statement):
        self.statement = statement

        return SimpleNamespace(
            scalar_one=lambda: 7,
            all=lambda: [],
        )


def compiled(statement):
    return statement.compile(
        dialect=postgresql.dialect(),
    )


def test_a_place_is_stored_once_per_coordinate_pair() -> None:
    db = CapturingSession()

    location_id = upsert_location(
        db=db,
        name="Paris",
        region="Ile-de-France",
        country="France",
        latitude=48.853412345,
        longitude=2.3488,
        timezone="Europe/Paris",
    )

    assert location_id == 7

    statement = compiled(db.statement)
    sql = str(statement)

    assert (
        "ON CONFLICT ON CONSTRAINT uq_locations_coordinates "
        "DO UPDATE"
    ) in sql

    assert "RETURNING locations.id" in sql

    # Rounded to the six decimal places the column stores, so the
    # uniqueness check compares the values that will be kept.
    assert Decimal("48.853412") in statement.params.values()


def test_recent_searches_take_the_newest_snapshot_per_place() -> None:
    db = CapturingSession()

    list_latest_snapshot_per_location(
        db=db,
        limit=5,
    )

    sql = str(
        compiled(db.statement)
    )

    assert (
        "DISTINCT ON (forecast_snapshots.location_id)"
    ) in sql

    assert "ORDER BY anon_1.retrieved_at DESC" in sql
