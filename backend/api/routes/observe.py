from fastapi import APIRouter, Query

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


@router.get("/forecast")
def forecast(
    city: str = Query(
        ...,
        min_length=2,
    ),
):
    return get_forecast_for_city(city)