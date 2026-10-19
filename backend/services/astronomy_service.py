import logging

import requests
from fastapi import HTTPException

from config import settings


logger = logging.getLogger(__name__)


NASA_APOD_URL = "https://api.nasa.gov/planetary/apod"

APOD_UNAVAILABLE_MESSAGE = (
    "The NASA Astronomy Picture of the Day service "
    "could not be reached. Try again later."
)


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
        # The exception text contains the full request
        # URL, and the URL contains the NASA API key, so
        # not even the log receives str(error).
        upstream_status = getattr(
            error.response,
            "status_code",
            None,
        )

        logger.warning(
            "NASA APOD request failed: %s (HTTP status %s)",
            type(error).__name__,
            upstream_status,
        )

        raise HTTPException(
            status_code=502,
            detail=APOD_UNAVAILABLE_MESSAGE,
        ) from error

    return {
        "title": data.get("title"),
        "date": data.get("date"),
        "explanation": data.get("explanation"),
        "media_type": data.get("media_type"),
        "url": data.get("url"),
        "copyright": data.get("copyright"),
    }