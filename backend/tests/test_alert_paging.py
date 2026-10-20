"""
Tests for paging through stored alerts.

Two guarantees matter here:

1. The total describes exactly the alerts the page was cut from, so
   the page query and the count query must apply identical filters.
2. Pages never overlap or skip an alert, so the order must be fully
   determined even when several alerts share an issue time.

The repository tests capture the SQL a query would run instead of
needing a database.
"""

from datetime import datetime, timezone

from sqlalchemy.dialects import postgresql

from repositories.space_weather_alert_repository import (
    count_alerts,
    list_alerts,
)
from services import space_weather_service
from services.space_weather_service import (
    get_space_weather_alerts,
)


NOW = datetime(
    2026,
    10,
    20,
    12,
    0,
    tzinfo=timezone.utc,
)


class CapturingSession:
    """
    Records the statements it is asked to run.
    """

    def __init__(
        self,
        count: int | None = 0,
    ):
        self.statements = []
        self.count = count

    def scalars(self, statement):
        self.statements.append(statement)

        return FakeScalarResult()

    def scalar(self, statement):
        self.statements.append(statement)

        return self.count


class FakeScalarResult:
    def all(self):
        return []


def compiled(statement):
    return statement.compile(
        dialect=postgresql.dialect(),
    )


def where_clause(sql: str) -> str:
    """
    The text between WHERE and the ORDER BY or LIMIT that follows it.
    """

    clause = sql.split("WHERE", 1)[1]

    for keyword in ("ORDER BY", "LIMIT"):
        clause = clause.split(keyword, 1)[0]

    return clause.strip()


# ---------------------------------------------------------------
# Repository queries
# ---------------------------------------------------------------

def test_pages_are_ordered_newest_first_with_an_id_tie_break() -> None:
    db = CapturingSession()

    list_alerts(
        db=db,
        limit=25,
        offset=50,
    )

    statement = compiled(db.statements[0])
    sql = str(statement)

    assert (
        "ORDER BY space_weather_alerts.issued_at DESC, "
        "space_weather_alerts.id DESC"
    ) in sql

    assert "LIMIT" in sql
    assert "OFFSET" in sql

    assert 25 in statement.params.values()
    assert 50 in statement.params.values()


def test_count_applies_the_same_filters_as_the_page() -> None:
    filters = {
        "severity": "G1",
        "alert_type": "warning",
        "source": "NOAA_SWPC",
        "status": "expired",
        "now": NOW,
    }

    page_db = CapturingSession()
    count_db = CapturingSession()

    list_alerts(
        db=page_db,
        limit=25,
        **filters,
    )

    count_alerts(
        db=count_db,
        **filters,
    )

    page = compiled(page_db.statements[0])
    count = compiled(count_db.statements[0])

    assert "count(*)" in str(count)

    assert where_clause(str(page)) == where_clause(str(count))

    for value in ("G1", "warning", "NOAA_SWPC", NOW):
        assert value in page.params.values()
        assert value in count.params.values()


def test_count_is_zero_when_nothing_matches() -> None:
    db = CapturingSession(
        count=None,
    )

    assert count_alerts(db=db) == 0


# ---------------------------------------------------------------
# Service
# ---------------------------------------------------------------

def test_service_reports_the_total_beside_the_page(
    monkeypatch,
) -> None:
    captured = {}

    def fake_list_alerts(db, **kwargs):
        captured["list"] = kwargs

        return []

    def fake_count_alerts(db, **kwargs):
        captured["count"] = kwargs

        return 78

    monkeypatch.setattr(
        space_weather_service,
        "list_alerts",
        fake_list_alerts,
    )

    monkeypatch.setattr(
        space_weather_service,
        "count_alerts",
        fake_count_alerts,
    )

    response = get_space_weather_alerts(
        db=object(),
        status="expired",
        limit=25,
        offset=25,
    )

    assert response.total == 78
    assert response.offset == 25
    assert response.count == 0

    assert captured["list"]["limit"] == 25
    assert captured["list"]["offset"] == 25

    # Both queries judge status against the same moment.
    page_filters = {
        key: value
        for key, value in captured["list"].items()
        if key not in ("limit", "offset")
    }

    assert page_filters == captured["count"]
    assert page_filters["status"] == "expired"
