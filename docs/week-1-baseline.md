# AstroCast Week 1 Baseline

## Verification Date

July 21, 2026

## Git Baseline

- Week 1 branch: `main`
- Week 1 working tree before branching: clean
- Week 2 branch: `feature/week-2-postgres-noaa`
- Week 2 working tree after branching: clean

## Backend Startup

Working directory:

```text
backend
```

Commands:

```cmd
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

## Frontend Startup

Working directory:

```text
frontend
```

Commands:

```cmd
cd frontend
npm run dev
```

Verified frontend URL:

```text
http://localhost:5173/
```

## Route Verification

| Route | Test Input | Result |
|---|---|---|
| `GET /health` | None | Passed, returned `{"status":"ok"}` |
| `GET /geocode` | `city=New Brunswick` | Passed |
| `GET /forecast` | `city=New Brunswick` | Passed |
| `GET /apod` | None | Passed |
| `GET /forecast` | `city=Alabasta` | Passed error handling, returned a clear no-location message |

## Verified Forecast Result

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

## Invalid-City Verification

Request:

```text
GET /forecast?city=Alabasta
```

Backend response:

```json
{
  "detail": "No location found for city: Alabasta"
}
```

Frontend behavior:

- Displays `No location found for city: Alabasta.`
- Does not produce a browser-console error
- Keeps the default Stargazing Score, Conditions, and Explanation cards visible

## Frontend Verification

- [x] Frontend starts
- [x] City input works
- [x] Check Sky button works
- [x] Forecast request succeeds
- [x] Score is displayed
- [x] Weather conditions are displayed
- [x] Explanation is displayed
- [x] Location and forecast time are displayed
- [x] No CORS error
- [x] No browser-console error
- [x] Invalid-city behavior documented

## Environment Variables

Current variable:

```text
NASA_API_KEY
```

Behavior:

- Loaded using `python-dotenv`
- Defaults to `DEMO_KEY`
- Local `.env` files are excluded by the root `.gitignore`

## Known Issues

1. The geocoder requests only one result and automatically accepts the first match.
2. Cities with duplicate names are not disambiguated.
3. The forecast-hour selector always prefers 10:00 PM on the first available forecast day.
4. The frontend keeps empty default cards visible after a failed search.
5. NASA APOD is available through the backend but is not rendered in the current frontend.
6. Several placeholder frontend components and mock-data modules are currently unused.
7. No database, persistence, migration, ingestion, deduplication, or fetch logging exists yet.

## Baseline Conclusion

The Week 1 AstroCast flow is functioning before Week 2 changes begin. The local forecast works end to end from the React frontend through FastAPI and Open-Meteo. NASA APOD and geocoding routes also work. No CORS or browser-console regressions were observed.
