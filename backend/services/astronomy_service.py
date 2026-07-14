import os

import requests
from dotenv import load_dotenv
from fastapi import HTTPException


load_dotenv()

NASA_APOD_URL = "https://api.nasa.gov/planetary/apod"
NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")


def get_apod():
    """
    Fetch NASA Astronomy Picture of the Day.

    This is optional for the MVP, but it makes AstroCast feel more connected
    to astronomy and space.
    """

    params = {
        "api_key": NASA_API_KEY,
    }

    try:
        response = requests.get(NASA_APOD_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"NASA APOD service failed: {str(error)}"
        )

    return {
        "title": data.get("title"),
        "date": data.get("date"),
        "explanation": data.get("explanation"),
        "media_type": data.get("media_type"),
        "url": data.get("url"),
        "copyright": data.get("copyright"),
    }