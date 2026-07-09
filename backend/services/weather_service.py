def get_mock_forecast(city: str):
    return {
        "location": {
            "city": city,
            "latitude": None,
            "longitude": None
        },
        "conditions": {
            "cloud_cover": "--",
            "precipitation_probability": "--",
            "temperature": "--",
            "wind_speed": "--",
            "visibility": "--"
        },
        "message": "This is mock forecast data. Real Open-Meteo data will be added on Day 5."
    }