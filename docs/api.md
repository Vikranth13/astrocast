# AstroCast API Reference

## Base URL

Local development:

```text
http://127.0.0.1:8000
```

Interactive documentation:

```text
http://127.0.0.1:8000/docs
```

## Current Routes

### `GET /`

Confirms that the AstroCast backend is running.

Example response:

```json
{
  "message": "AstroCast backend is running"
}
```

### `GET /health`

Returns the current backend health state.

Verified response:

```json
{
  "status": "ok"
}
```

A database health check may be added during Week 2 Day 2.

### `GET /geocode`

Converts a city name into normalized location information.

Query parameters:

| Name | Type | Required | Validation |
|---|---|---|---|
| `city` | string | Yes | Minimum length 2 |

Example request:

```text
GET /geocode?city=New%20Brunswick
```

Response shape:

```json
{
  "name": "New Brunswick",
  "region": "New Jersey",
  "country": "United States",
  "latitude": 40.48622,
  "longitude": -74.45182,
  "timezone": "America/New_York"
}
```

Current behavior:

- Open-Meteo is requested with `count=1`.
- Only the first matching location is returned.
- Cities with the same name are not yet disambiguated.

No-match response:

```json
{
  "detail": "No location found for city: Alabasta"
}
```

### `GET /forecast`

Returns the local forecast and stargazing score for a city.

Query parameters:

| Name | Type | Required | Validation |
|---|---|---|---|
| `city` | string | Yes | Minimum length 2 |

Example request:

```text
GET /forecast?city=New%20Brunswick
```

Verified response from July 21, 2026:

```json
{
  "location": {
    "name": "New Brunswick",
    "region": "New Jersey",
    "country": "United States",
    "latitude": 40.48622,
    "longitude": -74.45182,
    "timezone": "America/New_York"
  },
  "forecast_time": "2026-07-21T22:00",
  "conditions": {
    "cloud_cover_percent": 100,
    "precipitation_probability_percent": 18,
    "temperature_f": 73.3,
    "wind_speed_mph": 8.1,
    "visibility_miles": 10.13
  },
  "stargazing": {
    "score": 26,
    "rating": "Poor",
    "explanation": "Tonight looks poor for stargazing because cloud cover is very high, rain chances are minimal, wind conditions are calm, and visibility is good."
  }
}
```

Response fields:

#### `location`

- `name`
- `region`
- `country`
- `latitude`
- `longitude`
- `timezone`

#### `forecast_time`

The hourly timestamp selected for scoring. The current implementation prefers 10:00 PM on the first available forecast date.

#### `conditions`

- `cloud_cover_percent`
- `precipitation_probability_percent`
- `temperature_f`
- `wind_speed_mph`
- `visibility_miles`

#### `stargazing`

- `score`
- `rating`
- `explanation`

No-match response:

```json
{
  "detail": "No location found for city: Alabasta"
}
```

External-service errors are returned with status code 502 and a descriptive `detail` field.

### `GET /apod`

Returns selected NASA Astronomy Picture of the Day fields.

Response shape:

```json
{
  "title": "string or null",
  "date": "YYYY-MM-DD or null",
  "explanation": "string or null",
  "media_type": "image, video, or null",
  "url": "string or null",
  "copyright": "string or null"
}
```

Configuration:

```env
NASA_API_KEY=your_nasa_api_key
```

When the variable is absent, the backend uses `DEMO_KEY`.

NASA request failures are converted into an HTTP 502 response.

## Planned Week 2 Routes

These routes do not exist yet.

### `POST /api/admin/ingestion/noaa`

Planned purpose:

- Call one NOAA source
- Parse and normalize records
- Store new records
- Skip duplicates
- Write a fetch log
- Return fetched, inserted, skipped, and failed counts

### `GET /api/space-weather/current`

Planned purpose:

Return:

- Source timestamp
- Data freshness
- Risk level
- Measurement or alert facts
- Plain-English explanation
