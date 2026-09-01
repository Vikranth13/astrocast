# AstroCast

AstroCast is a full-stack astronomy and space-weather intelligence platform that helps users understand when and where sky-observing conditions are favorable.

It combines local weather forecasts, astronomy data, and NOAA space-weather measurements into clear scores, risk levels, freshness indicators, and plain-English explanations.

## Why AstroCast

People interested in astronomy often need to check several sources before deciding whether to observe the sky.

A general weather application may report clouds, rain, wind, or visibility, but it usually does not explain how those conditions affect stargazing. Scientific space-weather sources provide useful information about geomagnetic activity, but the raw measurements can be difficult for beginners to interpret.

AstroCast brings these signals together in one application.

## Current Capabilities

### Local Stargazing Forecasts

Users can search for a city and receive:

- Location name, region, country, latitude, and longitude
- Forecast time
- Cloud-cover percentage
- Precipitation probability
- Temperature
- Wind speed
- Visibility
- Stargazing score from 0 to 100
- Rating such as Excellent, Good, Okay, Poor, or Bad
- Plain-English explanation of the score

### NOAA Space-Weather Ingestion

AstroCast integrates the NOAA Space Weather Prediction Center Planetary K-index product.

The ingestion pipeline:

- Calls the NOAA SWPC API
- Applies HTTP timeouts and error handling
- Validates source records with Pydantic
- Normalizes NOAA data into AstroCast’s internal format
- Converts timestamps to UTC
- Preserves the raw NOAA payload
- Generates deterministic SHA-256 deduplication keys
- Stores measurements in PostgreSQL
- Skips records that already exist
- Records successful and failed fetch attempts

NOAA ingestion is currently triggered manually through an administration endpoint.

### Current Space Weather

AstroCast reads the newest stored Planetary K-index measurement and returns:

- Current Kp value
- NOAA G1 through G5 geomagnetic-storm classification
- Below-storm classification when Kp is below G1
- Observation timestamp
- Ingestion timestamp
- Current, delayed, or stale freshness status
- Running a-index value
- Contributing station count
- Plain-English explanation

The React frontend displays this information in a global Space Weather card that loads automatically when the page opens.

### Astronomy Content

The backend also includes an endpoint for NASA Astronomy Picture of the Day data.

NASA APOD may return an upstream error when using NASA's shared `DEMO_KEY`. This does not block the local forecast or NOAA space-weather features.

### Database Persistence

AstroCast uses PostgreSQL, SQLAlchemy, and Alembic.

The current database schema contains:

- `locations`
- `space_weather_alerts`
- `space_weather_measurements`
- `api_fetch_logs`

The schema includes:

- Primary keys
- Unique constraints
- Check constraints
- Database indexes
- UTC-aware timestamps
- PostgreSQL JSONB payload storage
- Duplicate protection for NOAA measurements

### Automated Testing

The backend test suite covers:

- NOAA client success and failure behavior
- Invalid HTTP and JSON responses
- NOAA source validation
- UTC timestamp normalization
- Deterministic deduplication
- Kp classification boundaries
- Freshness calculations
- Current-space-weather response construction
- FastAPI route behavior
- Upstream error mapping

The frontend test suite covers:

- Space-weather loading state
- Space-weather error state
- Space-weather success state
- Automatic NOAA loading
- City forecast interaction
- Preservation of space-weather data after a failed city search

## System Architecture

```text
                           +----------------------+
                           |    React Frontend    |
                           | TypeScript and Vite  |
                           +----------+-----------+
                                      |
                                      | HTTP
                                      v
                           +----------------------+
                           |   FastAPI Backend    |
                           |  Python and Pydantic |
                           +----+------------+----+
                                |            |
                    Forecast    |            | Stored space weather
                                |            |
                                v            v
                    +----------------+   +----------------+
                    |   Open-Meteo   |   |   PostgreSQL   |
                    | Geocoding and  |   | Measurements,  |
                    | Forecast APIs  |   | logs, metadata |
                    +----------------+   +--------+-------+
                                                 ^
                                                 |
                                    Normalized NOAA records
                                                 |
                                      +----------+----------+
                                      | NOAA ingestion flow |
                                      +----------+----------+
                                                 |
                                                 v
                                      +---------------------+
                                      |     NOAA SWPC       |
                                      | Planetary K-index   |
                                      +---------------------+
```

## Data Flows

### Local Forecast Flow

```text
City search
    |
    v
Open-Meteo geocoding
    |
    v
Open-Meteo weather forecast
    |
    v
Weather normalization
    |
    v
Stargazing score
    |
    v
Plain-English explanation
    |
    v
React forecast cards
```

### NOAA Ingestion Flow

```text
POST /api/admin/ingestion/noaa
    |
    v
Create fetch log with status "started"
    |
    v
Call NOAA SWPC
    |
    v
Validate source records
    |
    v
Normalize measurements
    |
    v
Generate deduplication keys
    |
    v
Batch insert into PostgreSQL
    |
    +----> New record: insert
    |
    `----> Existing record: skip
    |
    v
Update fetch log with final result
```

### Current Space-Weather Flow

```text
React page loads
    |
    v
GET /api/space-weather/current
    |
    v
Query newest stored Kp measurement
    |
    v
Calculate freshness
    |
    v
Classify geomagnetic activity
    |
    v
Return normalized response
    |
    v
Display Space Weather card
```

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Vitest
- React Testing Library
- jsdom

### Backend

- Python
- FastAPI
- Pydantic
- Pydantic Settings
- Requests
- Pytest
- HTTPX

### Data Layer

- PostgreSQL
- SQLAlchemy
- Alembic
- Psycopg
- PostgreSQL JSONB

### External Data Sources

- Open-Meteo Geocoding API
- Open-Meteo Forecast API
- NASA Astronomy Picture of the Day API
- NOAA Space Weather Prediction Center

### Development and Tooling

- Docker Desktop
- Docker Compose
- Git
- GitHub
- VS Code

## Project Structure

```text
astrocast/
|-- backend/
|   |-- alembic/
|   |   |-- versions/
|   |   `-- env.py
|   |-- api/
|   |   |-- errors.py
|   |   `-- routes/
|   |       |-- admin_ingestion.py
|   |       |-- astronomy.py
|   |       |-- observe.py
|   |       |-- space_weather.py
|   |       `-- system.py
|   |-- clients/
|   |   `-- noaa_swpc_client.py
|   |-- models/
|   |   |-- api_fetch_log.py
|   |   |-- base.py
|   |   |-- location.py
|   |   |-- space_weather_alert.py
|   |   `-- space_weather_measurement.py
|   |-- parsers/
|   |   `-- noaa_kp_parser.py
|   |-- schemas/
|   |   |-- ingestion.py
|   |   |-- noaa_kp.py
|   |   |-- normalized_measurement.py
|   |   `-- space_weather.py
|   |-- repositories/
|   |   |-- fetch_log_repository.py
|   |   |-- space_weather_alert_repository.py
|   |   `-- space_weather_repository.py
|   |-- services/
|   |   |-- astronomy_service.py
|   |   |-- explanation_service.py
|   |   |-- noaa_ingestion_service.py
|   |   |-- scoring_service.py
|   |   |-- space_weather_risk_service.py
|   |   |-- space_weather_service.py
|   |   `-- weather_service.py
|   |-- tests/
|   |   |-- test_api_routes.py
|   |   |-- test_error_handling.py
|   |   |-- test_explanation_service.py
|   |   |-- test_noaa_alert_parser.py
|   |   |-- test_noaa_client.py
|   |   |-- test_noaa_ingestion_counters.py
|   |   |-- test_noaa_kp_parser.py
|   |   |-- test_noaa_solar_wind_parser.py
|   |   |-- test_space_weather_risk_service.py
|   |   `-- test_space_weather_service.py
|   |-- alembic.ini
|   |-- config.py
|   |-- database.py
|   |-- main.py
|   |-- pytest.ini
|   |-- requirements.txt
|   `-- requirements-dev.txt
|-- docs/
|   |-- api-collection/
|   |-- API_PLAN.md
|   |-- ARCHITECTURE.md
|   |-- api.md
|   |-- backlog.md
|   |-- current-space-weather.md
|   |-- database.md
|   |-- mvp.md
|   |-- noaa-ingestion.md
|   |-- noaa-kp-source.md
|   |-- project-brief.md
|   |-- testing.md
|   |-- week-1-baseline.md
|   `-- week-2-report.md
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |   `-- astrocastApi.ts
|   |   |-- components/
|   |   |   |-- SpaceWeatherCard.test.tsx
|   |   |   `-- SpaceWeatherCard.tsx
|   |   |-- test/
|   |   |   `-- setup.ts
|   |   |-- App.css
|   |   |-- App.test.tsx
|   |   |-- App.tsx
|   |   `-- main.tsx
|   |-- package.json
|   |-- package-lock.json
|   |-- vite.config.ts
|   `-- vitest.config.ts
|-- .env.example
|-- .gitignore
|-- compose.yaml
`-- README.md
```

## Local Development Setup

### Prerequisites

Install:

- Python
- Node.js and npm
- Docker Desktop
- Git

### 1. Clone the Repository

```cmd
git clone <repository-url>
cd astrocast
```

### 2. Create the Environment File

Copy the example environment file:

```cmd
copy .env.example .env
```

Update `.env` with local values.

Example:

```env
POSTGRES_USER=astrocast
POSTGRES_PASSWORD=astrocast_dev_password
POSTGRES_DB=astrocast
POSTGRES_PORT=5432

DATABASE_URL=postgresql+psycopg://astrocast:astrocast_dev_password@localhost:5432/astrocast

NASA_API_KEY=DEMO_KEY

OPEN_METEO_GEOCODING_URL=https://geocoding-api.open-meteo.com/v1/search
OPEN_METEO_FORECAST_URL=https://api.open-meteo.com/v1/forecast

NOAA_PLANETARY_K_INDEX_URL=https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
NOAA_REQUEST_TIMEOUT_SECONDS=15
```

Do not commit `.env`.

### 3. Start PostgreSQL

Open Docker Desktop and wait for the Docker engine to start.

For the first startup:

```cmd
docker compose up -d postgres
```

For later startups:

```cmd
docker compose start postgres
```

Check the container:

```cmd
docker compose ps
```

PostgreSQL should report a healthy status.

### 4. Install Backend Dependencies

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
```

For testing dependencies:

```cmd
python -m pip install -r requirements-dev.txt
```

### 5. Apply Database Migrations

From the `backend` directory:

```cmd
python -m alembic upgrade head
```

Check the active revision:

```cmd
python -m alembic current
```

Check for schema drift:

```cmd
python -m alembic check
```

The initial AstroCast database revision is:

```text
e2461684f17c
```

This is an Alembic migration identifier, not a Git commit ID.

### 6. Start the Backend

From the `backend` directory:

```cmd
venv\Scripts\activate
python -m uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

### 7. Start the Frontend

Open another terminal:

```cmd
cd frontend
npm install
npm run dev
```

The frontend will normally run at:

```text
http://localhost:5173
```

If port `5173` is already in use, Vite may use another port such as:

```text
http://localhost:5174
```

## NOAA Ingestion

The frontend reads NOAA data from PostgreSQL. It does not call NOAA directly.

Run ingestion manually after starting the backend:

```cmd
curl -X POST http://127.0.0.1:8000/api/admin/ingestion/noaa
```

Example successful response:

```json
{
  "source": "NOAA_SWPC",
  "status": "success",
  "fetch_log_id": 34,
  "fetched": 75,
  "normalized": 73,
  "inserted": 0,
  "skipped": 73,
  "failed": 0
}
```

### Reading the counters

`fetched` counts raw records NOAA returned. `normalized` counts the logical records produced after validation, filtering, and supersede resolution. Insert and skip counts apply to normalized records, so the invariant is:

```text
normalized = inserted + skipped
```

`fetched` is deliberately outside that equation, because normalization is not one to one. The difference between the two is signed and describes what normalization did:

- **Alerts collapse.** NOAA reissues a corrected notification under the same serial number, and only the newest version survives parsing. A run fetching 75 rows may normalize to 73. Those two were superseded, not rejected as duplicates.
- **Solar wind expands.** One reading yields separate speed, density, and temperature measurements, so a first run legitimately stores more rows than it fetched.
- **Kp is one to one.**

A repeated ingestion inserts 0 and skips everything, with `normalized` unchanged.

The administration endpoint is intended for local development and is not currently authenticated. Do not expose it publicly in its present form.

## Current API Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Confirms that the backend is running |
| GET | `/health` | Returns backend and database health |
| GET | `/geocode?city=...` | Converts a city name into location data |
| GET | `/forecast?city=...` | Returns a local stargazing forecast |
| GET | `/apod` | Returns NASA Astronomy Picture of the Day data |
| GET | `/api/space-weather/current` | Returns the newest stored space-weather measurement |
| GET | `/api/space-weather/risk` | Returns the deterministic risk assessment |
| GET | `/api/space-weather/alerts` | Returns a filterable alert list |
| GET | `/api/space-weather/alerts/{id}` | Returns one alert with an explanation |
| GET | `/api/space-weather/trends/kp` | Returns the Kp time series |
| GET | `/api/space-weather/trends/solar-wind` | Returns the solar-wind time series |
| POST | `/api/admin/ingestion/noaa` | Runs NOAA Planetary K-index ingestion |
| POST | `/api/admin/ingestion/noaa/alerts` | Runs NOAA alert ingestion |
| POST | `/api/admin/ingestion/noaa/solar-wind` | Runs NOAA solar-wind ingestion |

Space-weather reads are served from PostgreSQL and never call NOAA, so they remain available during an upstream outage. Full reference in `docs/api.md`, with a Bruno request collection in `docs/api-collection/`.

### Error Format

Every non-success response uses one envelope:

```json
{
  "error": {
    "code": "not_found",
    "message": "Space-weather alert was not found.",
    "details": null
  }
}
```

Clients should branch on `code`, not on the message. Validation errors put per-field information in `details`. Internal failures are logged server-side with their traceback and reported generically, so exception text and connection details never reach a response.

## Example Current Space-Weather Response

```json
{
  "source": "NOAA_SWPC",
  "metric_name": "planetary_k_index",
  "observed_at": "2026-08-03T15:00:00Z",
  "ingested_at": "2026-08-03T18:30:16Z",
  "freshness": {
    "status": "current",
    "age_minutes": 180
  },
  "geomagnetic_activity": {
    "level": "below_storm",
    "label": "Below geomagnetic storm level",
    "noaa_scale": null,
    "is_storm": false
  },
  "facts": {
    "kp": 1.67,
    "a_running": 6,
    "station_count": 8
  },
  "explanation": "The latest observed planetary K-index is 1.67. This is below NOAA geomagnetic storm level."
}
```

Values depend on the latest stored NOAA observation.

## Database Migrations

Alembic manages database-schema changes.

### Apply All Migrations

```cmd
cd backend
python -m alembic upgrade head
```

### Show Current Migration

```cmd
python -m alembic current
```

### Check for Model and Schema Drift

```cmd
python -m alembic check
```

### Downgrade the Latest Migration

```cmd
python -m alembic downgrade -1
```

Do not downgrade a database containing important data without understanding the migration’s `downgrade()` behavior.

## Testing

### Backend Tests

From the backend directory:

```cmd
cd backend
venv\Scripts\activate
python -m pytest
```

Verbose output:

```cmd
python -m pytest -v
```

Coverage:

```cmd
python -m pytest --cov=clients --cov=parsers --cov=services --cov-report=term-missing
```

The backend unit tests use fake external responses and FastAPI dependency overrides. They should not call the real NOAA endpoint or modify PostgreSQL.

### Frontend Tests

From the frontend directory:

```cmd
cd frontend
npm test
```

Watch mode:

```cmd
npm run test:watch
```

### Frontend Lint and Production Build

```cmd
npm run lint
npm run build
```

## Useful Database Commands

### Show Tables

```cmd
docker compose exec postgres psql -U astrocast -d astrocast -c "\dt"
```

### Count NOAA Measurements

```cmd
docker compose exec postgres psql -U astrocast -d astrocast -c "SELECT COUNT(*) FROM space_weather_measurements;"
```

### Show the Latest Measurement

```cmd
docker compose exec postgres psql -U astrocast -d astrocast -c "SELECT id, observed_at, numeric_value, created_at, raw_payload FROM space_weather_measurements ORDER BY observed_at DESC LIMIT 1;"
```

### Show Recent Fetch Logs

```cmd
docker compose exec postgres psql -U astrocast -d astrocast -c "SELECT id, status, fetched_count, inserted_count, skipped_count, failed_count, http_status_code FROM api_fetch_logs ORDER BY id DESC LIMIT 10;"
```

### Check for Duplicate Measurements

```cmd
docker compose exec postgres psql -U astrocast -d astrocast -c "SELECT source, deduplication_key, COUNT(*) FROM space_weather_measurements GROUP BY source, deduplication_key HAVING COUNT(*) > 1;"
```

The duplicate query should return zero rows.

## Stopping the Application

Stop the backend or frontend terminal with:

```text
Ctrl + C
```

Stop PostgreSQL while preserving its data:

```cmd
docker compose stop postgres
```

To stop all Compose services:

```cmd
docker compose down
```

Do not use the following command unless you intentionally want to delete PostgreSQL’s stored volume:

```cmd
docker compose down -v
```

## Current Status

AstroCast currently supports an end-to-end local stargazing forecast and a persistent NOAA space-weather pipeline.

Completed functionality includes:

- Open-Meteo city geocoding
- Local weather retrieval
- Stargazing score calculation
- Plain-English forecast explanation
- PostgreSQL database integration
- SQLAlchemy models
- Alembic migrations
- NOAA Planetary K-index client
- Pydantic source validation
- NOAA data normalization
- Duplicate-safe PostgreSQL ingestion
- API fetch logging
- Current-space-weather API
- Geomagnetic risk classification
- Freshness calculation
- React Space Weather card
- NOAA alert ingestion with supersede resolution
- Solar-wind ingestion
- Historical Kp and solar-wind trend endpoints
- Filterable alert list and detail endpoints
- Deterministic explanation engine with mandatory caveats
- Standardized API error envelope with global exception handlers
- Bounded retries with exponential backoff for transient NOAA failures
- Backend automated tests
- Frontend component and workflow tests

## Known Limitations

- City searches currently select the first matching geocoding result.
- Cities with the same name are not yet disambiguated.
- The local forecast evaluates a fixed evening observation time.
- NOAA ingestion is triggered manually rather than on a schedule.
- The ingestion administration endpoints are unauthenticated and must not be exposed publicly.
- Corrected NOAA measurements are skipped rather than updated. Corrected *alerts* are handled: a reissued notification supersedes the earlier version during parsing.
- Space-weather output describes global geomagnetic activity, not a location-specific aurora forecast. Every explanation states this rather than implying otherwise.
- The `locations` table exists but city searches are not yet persisted.
- NASA APOD may fail when using the shared `DEMO_KEY`.
- The frontend API base URL is currently configured for local development.
- The frontend consumes only `/api/space-weather/current`; trends, alerts, and risk are available but not yet displayed.
- `backend/requirements.txt` is a full environment freeze rather than a runtime dependency list. Scheduled for Week 8.
- Historical alert rows backfilled by migration `0dc8d08221c3` inherit the earlier counter overstatement and can read slightly high.
- Deployment and continuous integration are not yet configured.

## Roadmap

Major project milestones include:

1. Local stargazing forecast
2. PostgreSQL persistence
3. NOAA ingestion and deduplication
4. Current space-weather risk output
5. Historical space-weather trends and charts
6. Scheduled data ingestion
7. Location persistence and disambiguation
8. Local aurora-potential scoring
9. Improved astronomy intelligence
10. Authentication and administration security
11. Continuous integration
12. Cloud deployment and monitoring

Detailed planning, architecture notes, source documentation, and progress reports are maintained in the `docs` directory.

## Project Goal

AstroCast is designed as both a useful astronomy application and a full-stack software engineering project demonstrating:

- External API integration
- Backend service architecture
- Scientific-data normalization
- Relational database design
- PostgreSQL persistence
- Database migrations
- Transactions
- Deduplication
- Fetch logging
- Error handling
- REST API design
- Automated testing
- React frontend integration
- Scientific-data interpretation
- Documentation
- Deployment preparation