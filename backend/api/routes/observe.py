from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas.errors import ErrorResponse
from schemas.observe import ForecastResponse
from services.forecast_history_service import (
    get_forecast_with_history,
)
from services.weather_service import geocode_city


router = APIRouter(
    tags=["observe"],
)


@router.get("/geocode")
def geocode(
    city: str = Query(
        ...,
        min_length=2,
    ),
):
    return geocode_city(city)


@router.get(
    "/forecast",
    response_model=ForecastResponse,
    responses={
        404: {
            "model": ErrorResponse,
            "description": (
                "No location matches the city."
            ),
        },
        502: {
            "model": ErrorResponse,
            "description": (
                "Open-Meteo could not be reached."
            ),
        },
    },
    summary="Get tonight's observing forecast",
)
def forecast(
    city: str = Query(
        ...,
        min_length=2,
    ),
    db: Session = Depends(get_db),
):
    """
    Return the stargazing score for tonight's forecast hour with its
    factor breakdown, every scored hour of the observing night, and the
    best window within it.

    The forecast is also saved to the search history. If it cannot be
    saved, it is still returned, with location_id set to null.
    """

    return get_forecast_with_history(
        db=db,
        city=city,
    )
