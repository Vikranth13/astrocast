from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas.errors import ErrorResponse
from schemas.observe import (
    ForecastHistoryResponse,
    RecentSearchListResponse,
)
from services.forecast_history_service import (
    get_forecast_history,
    get_recent_searches,
)


router = APIRouter(
    prefix="/api/locations",
    tags=["locations"],
)


HISTORY_UNAVAILABLE_RESPONSE = {
    503: {
        "model": ErrorResponse,
        "description": (
            "The database could not be reached."
        ),
    },
}


@router.get(
    "/recent",
    response_model=RecentSearchListResponse,
    responses=HISTORY_UNAVAILABLE_RESPONSE,
    summary="List recent searches",
)
def recent_searches(
    limit: int = Query(
        default=5,
        ge=1,
        le=20,
        description=(
            "Maximum places to return, most "
            "recently checked first."
        ),
    ),
    db: Session = Depends(get_db),
):
    """
    Return recently searched places, each with the latest saved check
    of its forecast. There are no user accounts, so the history is
    shared by everyone using this backend.
    """

    return get_recent_searches(
        db=db,
        limit=limit,
    )


@router.get(
    "/{location_id}/forecasts",
    response_model=ForecastHistoryResponse,
    responses={
        404: {
            "model": ErrorResponse,
            "description": (
                "No searched location has this id."
            ),
        },
        **HISTORY_UNAVAILABLE_RESPONSE,
    },
    summary="List a location's forecast history",
)
def location_forecasts(
    location_id: int,
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
        description=(
            "Maximum checks to return, newest first."
        ),
    ),
    db: Session = Depends(get_db),
):
    """
    Return one place's saved forecast checks, newest first. Each check
    names the forecast hour it was for.
    """

    return get_forecast_history(
        db=db,
        location_id=location_id,
        limit=limit,
    )
