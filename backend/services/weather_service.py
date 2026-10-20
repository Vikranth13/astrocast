import logging

import requests
from fastapi import HTTPException

from config import settings
from services.scoring_service import (
    calculate_stargazing_score,
    find_best_window,
)


logger = logging.getLogger(__name__)


GEOCODING_URL = settings.open_meteo_geocoding_url
FORECAST_URL = settings.open_meteo_forecast_url

# A requests exception carries the request URL, the
# upstream host, and library object reprs. That detail
# belongs in the server log, so clients receive these
# fixed messages instead.
GEOCODING_UNAVAILABLE_MESSAGE = (
    "The location search service could not be "
    "reached. Try again in a few minutes."
)

WEATHER_UNAVAILABLE_MESSAGE = (
    "The weather forecast service could not be "
    "reached. Try again in a few minutes."
)

# The observing night is a fixed local-time window until Week 6 adds
# real sunset and astronomical twilight times: twelve hourly readings
# from 18:00 on the first forecast day through 05:00 the next morning.
OBSERVING_NIGHT_START_HOUR = 18

OBSERVING_NIGHT_HOURS = 12

def geocode_city(city: str):
    """
    Convert a city name into latitude/longitude using Open-Meteo Geocoding API.

    Example:
    "New Brunswick" -> latitude, longitude, state, country, timezone
    """

    params = {
        "name": city,
        "count": 1,
        "language": "en",
        "format": "json",
    }

    try:
        response = requests.get(GEOCODING_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as error:
        logger.warning(
            "Open-Meteo geocoding request failed: %s",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail=GEOCODING_UNAVAILABLE_MESSAGE,
        ) from error

    results = data.get("results")

    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"No location found for city: {city}"
        )

    location = results[0]

    return {
        "name": location.get("name"),
        "region": location.get("admin1"),
        "country": location.get("country"),
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
        "timezone": location.get("timezone"),
    }


def get_weather_for_location(latitude: float, longitude: float, timezone: str | None = None):
    """
    Fetch hourly weather forecast data from Open-Meteo.

    For AstroCast MVP, we care about:
    - cloud cover
    - precipitation probability
    - temperature
    - wind speed
    - visibility
    """

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": ",".join([
            "cloud_cover",
            "precipitation_probability",
            "temperature_2m",
            "wind_speed_10m",
            "visibility",
        ]),
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
        "forecast_days": 2,
        "timezone": timezone or "auto",
    }

    try:
        response = requests.get(FORECAST_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as error:
        logger.warning(
            "Open-Meteo forecast request failed: %s",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail=WEATHER_UNAVAILABLE_MESSAGE,
        ) from error

    return data


def select_tonight_forecast(hourly_data: dict):
    """
    Pick a simple 'tonight' forecast hour.

    For now, we use 10 PM from the first available forecast day.
    Later, we can make this smarter based on the user's local time.
    """

    times = hourly_data.get("time", [])

    if not times:
        raise HTTPException(
            status_code=500,
            detail="Weather data did not include hourly timestamps."
        )

    first_date = times[0].split("T")[0]
    target_time = f"{first_date}T22:00"

    if target_time in times:
        return times.index(target_time)

    # Fallback: use the first available forecast hour.
    return 0


def meters_to_miles(meters: float | None):
    if meters is None:
        return None

    return round(meters / 1609.34, 2)


def get_value(hourly_data: dict, key: str, index: int):
    values = hourly_data.get(key)

    if not values:
        return None

    if index >= len(values):
        return None

    return values[index]


def extract_conditions(
    hourly_data: dict,
    index: int,
) -> dict:
    """
    Read the AstroCast weather conditions for one hourly reading.
    """

    visibility_meters = get_value(
        hourly_data,
        "visibility",
        index,
    )

    return {
        "cloud_cover_percent": get_value(
            hourly_data,
            "cloud_cover",
            index,
        ),
        "precipitation_probability_percent": get_value(
            hourly_data,
            "precipitation_probability",
            index,
        ),
        "temperature_f": get_value(
            hourly_data,
            "temperature_2m",
            index,
        ),
        "wind_speed_mph": get_value(
            hourly_data,
            "wind_speed_10m",
            index,
        ),
        "visibility_miles": meters_to_miles(
            visibility_meters
        ),
    }


def select_observing_night(
    hourly_data: dict,
) -> list[int]:
    """
    Return the indexes of the hourly readings that make up tonight.

    The night starts at OBSERVING_NIGHT_START_HOUR on the first forecast
    day and runs for OBSERVING_NIGHT_HOURS readings, crossing midnight.
    It is cut short if the forecast ends sooner, and is empty if the
    start hour is missing.
    """

    times = hourly_data.get("time", [])

    if not times:
        return []

    first_date = times[0].split("T")[0]

    start_time = (
        f"{first_date}T"
        f"{OBSERVING_NIGHT_START_HOUR:02d}:00"
    )

    if start_time not in times:
        return []

    start_index = times.index(start_time)

    end_index = min(
        start_index + OBSERVING_NIGHT_HOURS,
        len(times),
    )

    return list(
        range(
            start_index,
            end_index,
        )
    )


def build_hourly_forecast(
    hourly_data: dict,
    indexes: list[int],
) -> list[dict]:
    """
    Score every hour of the observing night with the same rules as the
    headline score.
    """

    hours = []

    for index in indexes:
        conditions = extract_conditions(
            hourly_data,
            index,
        )

        stargazing = calculate_stargazing_score(
            conditions
        )

        hours.append(
            {
                "time": get_value(
                    hourly_data,
                    "time",
                    index,
                ),
                **conditions,
                "score": stargazing["score"],
                "rating": stargazing["rating"],
            }
        )

    return hours


def get_forecast_for_city(city: str):
    """
    Main function used by the /forecast route.

    Steps:
    1. Convert city to coordinates.
    2. Fetch weather using coordinates.
    3. Extract the forecast for tonight, and score every hour of the
       observing night.
    4. Return clean AstroCast-shaped JSON.

    All times are local to the location and carry no UTC offset, because
    that is how Open-Meteo returns them when given a timezone.
    """

    location = geocode_city(city)

    raw_weather = get_weather_for_location(
        latitude=location["latitude"],
        longitude=location["longitude"],
        timezone=location["timezone"],
    )

    hourly = raw_weather.get("hourly", {})
    forecast_index = select_tonight_forecast(hourly)

    conditions = extract_conditions(
        hourly,
        forecast_index,
    )

    stargazing = calculate_stargazing_score(conditions)

    night = build_hourly_forecast(
        hourly,
        select_observing_night(hourly),
    )

    return {
        "location": location,
        "forecast_time": get_value(hourly, "time", forecast_index),
        "conditions": conditions,
        "stargazing": stargazing,
        "hourly": night,
        "best_window": find_best_window(night),
    }