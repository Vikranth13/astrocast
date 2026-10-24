"""
Search history for the local observing forecast.

Every successful forecast is recorded as a snapshot of what it showed,
so later checks of the same place can be compared with earlier ones.
There are no user accounts: the history belongs to this backend and is
shared by everyone using it.

The forecast never depends on the history. /forecast calls Open-Meteo
and must keep working while PostgreSQL is unavailable, so a failed save
is logged and the forecast is returned without a location id.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from models.forecast_snapshot import ForecastSnapshot
from models.location import Location
from repositories.forecast_snapshot_repository import (
    add_snapshot,
    get_latest_snapshot,
    list_latest_snapshot_per_location,
    list_snapshots,
    refresh_snapshot,
)
from repositories.location_repository import (
    get_location_by_id,
    upsert_location,
)
from schemas.observe import (
    ForecastHistoryResponse,
    ForecastSnapshotSummary,
    RecentSearch,
    RecentSearchListResponse,
    SavedLocation,
)
from services.weather_service import get_forecast_for_city


logger = logging.getLogger(__name__)


# A repeat check of the same place and forecast hour within this window
# refreshes the latest snapshot instead of adding another. Repeat
# searches, the Dashboard refreshing when you return to it, and
# development mode's doubled requests would otherwise fill the history
# with near-identical rows.
SNAPSHOT_REFRESH_WINDOW = timedelta(minutes=60)

HISTORY_UNAVAILABLE_MESSAGE = (
    "Search history is unavailable because the "
    "database could not be reached."
)

LOCATION_NOT_FOUND_MESSAGE = (
    "No searched location has this id."
)


def build_snapshot_values(
    forecast: dict[str, Any],
    retrieved_at: datetime,
) -> dict[str, Any]:
    """
    The columns a snapshot stores for one forecast.
    """

    stargazing = forecast["stargazing"]
    best_window = forecast.get("best_window")

    return {
        "retrieved_at": retrieved_at,
        "forecast_time": forecast["forecast_time"],
        "score": stargazing["score"],
        "rating": stargazing["rating"],
        "limiting_factor": stargazing.get("limiting_factor"),
        "best_window_first_hour": (
            best_window["first_hour"]
            if best_window
            else None
        ),
        "best_window_last_hour": (
            best_window["last_hour"]
            if best_window
            else None
        ),
        "best_window_qualifies": (
            best_window["qualifies"]
            if best_window
            else None
        ),
        "response": forecast,
    }


def record_forecast(
    db: Session,
    forecast: dict[str, Any],
    now: datetime | None = None,
) -> int | None:
    """
    Save a forecast to the search history and return its location id.

    Returns None, and leaves the database unchanged, if anything goes
    wrong. A forecast is still worth showing when it cannot be saved.
    """

    retrieved_at = now or datetime.now(timezone.utc)

    location = forecast["location"]

    try:
        location_id = upsert_location(
            db=db,
            name=location["name"],
            region=location.get("region"),
            country=location.get("country"),
            latitude=location["latitude"],
            longitude=location["longitude"],
            timezone=location.get("timezone"),
        )

        values = build_snapshot_values(
            forecast,
            retrieved_at,
        )

        latest = get_latest_snapshot(
            db=db,
            location_id=location_id,
            forecast_time=forecast["forecast_time"],
        )

        if (
            latest is not None
            and retrieved_at - latest.retrieved_at
            < SNAPSHOT_REFRESH_WINDOW
        ):
            refresh_snapshot(
                latest,
                values,
            )

        else:
            add_snapshot(
                db=db,
                values={
                    "location_id": location_id,
                    **values,
                },
            )

        db.commit()

    except SQLAlchemyError:
        logger.warning(
            "Could not save forecast history for %s",
            location.get("name"),
            exc_info=True,
        )

        try:
            db.rollback()
        except SQLAlchemyError:
            logger.warning(
                "Rolling back the failed history save also failed",
            )

        return None

    return location_id


def get_forecast_with_history(
    db: Session,
    city: str,
) -> dict[str, Any]:
    """
    Fetch tonight's forecast for a city and record it in the history.
    """

    forecast = get_forecast_for_city(city)

    location_id = record_forecast(
        db,
        forecast,
    )

    return {
        **forecast,
        "location_id": location_id,
    }


# ---------------------------------------------------------------
# Reading the history
# ---------------------------------------------------------------

def to_saved_location(
    location: Location,
) -> SavedLocation:
    return SavedLocation(
        id=location.id,
        name=location.name,
        region=location.region,
        country=location.country,
        latitude=float(location.latitude),
        longitude=float(location.longitude),
        timezone=location.timezone,
    )


def to_snapshot_summary(
    snapshot: ForecastSnapshot,
) -> ForecastSnapshotSummary:
    return ForecastSnapshotSummary(
        retrieved_at=snapshot.retrieved_at,
        forecast_time=snapshot.forecast_time,
        score=snapshot.score,
        rating=snapshot.rating,
        limiting_factor=snapshot.limiting_factor,
        best_window_first_hour=snapshot.best_window_first_hour,
        best_window_last_hour=snapshot.best_window_last_hour,
        best_window_qualifies=snapshot.best_window_qualifies,
    )


def get_recent_searches(
    db: Session,
    limit: int,
) -> RecentSearchListResponse:
    """
    Recently searched places, each with its latest check.
    """

    try:
        rows = list_latest_snapshot_per_location(
            db=db,
            limit=limit,
        )

    except SQLAlchemyError as error:
        logger.warning(
            "Could not read recent searches",
            exc_info=True,
        )

        raise HTTPException(
            status_code=503,
            detail=HISTORY_UNAVAILABLE_MESSAGE,
        ) from error

    searches = [
        RecentSearch(
            location=to_saved_location(location),
            latest=to_snapshot_summary(snapshot),
        )
        for location, snapshot in rows
    ]

    return RecentSearchListResponse(
        count=len(searches),
        searches=searches,
    )


def get_forecast_history(
    db: Session,
    location_id: int,
    limit: int,
) -> ForecastHistoryResponse:
    """
    One place's saved forecast checks, newest first.
    """

    try:
        location = get_location_by_id(
            db=db,
            location_id=location_id,
        )

        snapshots = (
            list_snapshots(
                db=db,
                location_id=location_id,
                limit=limit,
            )
            if location is not None
            else []
        )

    except SQLAlchemyError as error:
        logger.warning(
            "Could not read forecast history",
            exc_info=True,
        )

        raise HTTPException(
            status_code=503,
            detail=HISTORY_UNAVAILABLE_MESSAGE,
        ) from error

    if location is None:
        raise HTTPException(
            status_code=404,
            detail=LOCATION_NOT_FOUND_MESSAGE,
        )

    summaries = [
        to_snapshot_summary(snapshot)
        for snapshot in snapshots
    ]

    return ForecastHistoryResponse(
        location=to_saved_location(location),
        count=len(summaries),
        snapshots=summaries,
    )
