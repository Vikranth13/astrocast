# AstroCast API Plan

## External APIs

### Open-Meteo Geocoding API

Purpose:
Convert city names into latitude and longitude.

Example:
User enters "New Brunswick" and the API returns coordinates.

### Open-Meteo Weather API

Purpose:
Fetch weather forecast data for the selected location.

Important fields:
- Cloud cover
- Precipitation probability
- Temperature
- Wind speed
- Visibility if available

### NASA APOD API

Purpose:
Display astronomy-related content such as the Astronomy Picture of the Day.

## Backend API Routes

### GET /health

Checks whether the backend is running.

### GET /forecast?city=New Brunswick

Returns the stargazing forecast for a city.

### GET /apod

Returns NASA Astronomy Picture of the Day data.