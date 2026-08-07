import requests
from fastapi import HTTPException

from config import settings


NASA_APOD_URL = "https://api.nasa.gov/planetary/apod"


def get_apod():
    """
    Fetch NASA Astronomy Picture of the Day.
    """

    params = {
        "api_key": settings.nasa_api_key,
    }

    try:
        response = requests.get(
            NASA_APOD_URL,
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"NASA APOD service failed: {str(error)}",
        )

    return {
        "title": data.get("title"),
        "date": data.get("date"),
        "explanation": data.get("explanation"),
        "media_type": data.get("media_type"),
        "url": data.get("url"),
        "copyright": data.get("copyright"),
    }