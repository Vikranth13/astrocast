from fastapi import APIRouter, Query

from schemas.errors import ErrorResponse
from schemas.observe import ForecastResponse
from services.weather_service import (
    geocode_city,
    get_forecast_for_city,
)


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
):
    """
    Return the stargazing score for tonight's forecast hour with its
    factor breakdown, every scored hour of the observing night, and the
    best window within it.
    """

    return get_forecast_for_city(city)
