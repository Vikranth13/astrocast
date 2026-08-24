from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.space_weather import (
    CurrentSpaceWeatherResponse,
)
from services.space_weather_service import (
    get_current_space_weather,
)


router = APIRouter(
    prefix="/api/space-weather",
    tags=["space-weather"],
)


@router.get(
    "/current",
    response_model=CurrentSpaceWeatherResponse,
    summary="Get current space weather",
)
def current_space_weather(
    db: Session = Depends(get_db),
):
    """
    Return the newest stored NOAA Planetary
    K-index observation.
    """

    return get_current_space_weather(
        db
    )