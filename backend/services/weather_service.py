import requests
from fastapi import HTTPException
from services.scoring_service import calculate_stargazing_score

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


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
        raise HTTPException(
            status_code=502,
            detail=f"Geocoding service failed: {str(error)}"
        )

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
        raise HTTPException(
            status_code=502,
            detail=f"Weather service failed: {str(error)}"
        )

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


def get_forecast_for_city(city: str):
    """
    Main function used by the /forecast route.

    Steps:
    1. Convert city to coordinates.
    2. Fetch weather using coordinates.
    3. Extract the forecast for tonight.
    4. Return clean AstroCast-shaped JSON.
    """

    location = geocode_city(city)

    raw_weather = get_weather_for_location(
        latitude=location["latitude"],
        longitude=location["longitude"],
        timezone=location["timezone"],
    )

    hourly = raw_weather.get("hourly", {})
    forecast_index = select_tonight_forecast(hourly)

    visibility_meters = get_value(hourly, "visibility", forecast_index)

    conditions = {
        "cloud_cover_percent": get_value(hourly, "cloud_cover", forecast_index),
        "precipitation_probability_percent": get_value(
            hourly,
            "precipitation_probability",
            forecast_index,
        ),
        "temperature_f": get_value(hourly, "temperature_2m", forecast_index),
        "wind_speed_mph": get_value(hourly, "wind_speed_10m", forecast_index),
        "visibility_miles": meters_to_miles(visibility_meters),
    }

    stargazing = calculate_stargazing_score(conditions)

    return {
        "location": location,
        "forecast_time": get_value(hourly, "time", forecast_index),
        "conditions": conditions,
        "stargazing": stargazing,
    }