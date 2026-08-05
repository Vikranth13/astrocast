# AstroCast Week 2 Progress Report

**Completion date:** August 5, 2026

## Week 2 Goal

Add PostgreSQL persistence, establish version-controlled database migrations, integrate one NOAA Space Weather Prediction Center source, expose current space weather through FastAPI, and display it in the React frontend.

## Completed Work

### PostgreSQL and Configuration

- Added PostgreSQL through Docker Compose
- Added centralized environment configuration
- Added SQLAlchemy engine and sessions
- Added database status to `/health`
- Added bounded database connection timeouts
- Preserved PostgreSQL data through a Docker volume

### Database Schema

Created four application tables:

- `locations`
- `space_weather_alerts`
- `space_weather_measurements`
- `api_fetch_logs`

Added:

- Primary keys
- Unique constraints
- Check constraints
- Indexes
- UTC-aware timestamps
- PostgreSQL JSONB raw payloads
- Predictable constraint naming

### Alembic

- Initialized Alembic
- Created initial schema migration
- Applied migration successfully
- Downgraded to base successfully
- Reapplied migration successfully
- Confirmed no schema drift with `alembic check`

Initial revision:

```text
e2461684f17c


NOAA Client and Parser

Integrated the observed NOAA Planetary K-index product.

Implemented:

Configurable NOAA URL
Configurable request timeout
HTTP error handling
JSON shape validation
Pydantic source validation
UTC timestamp normalization
Decimal Kp values
Source-independent normalized records
Deterministic SHA-256 deduplication keys
Raw source-payload preservation
NOAA Ingestion

Added:

POST /api/admin/ingestion/noaa

The ingestion workflow:

Creates a started fetch log
Calls NOAA
Validates and normalizes records
Inserts records in a batch
Uses PostgreSQL conflict handling
Skips existing observations
Records success and failure outcomes
Returns fetched, inserted, skipped, and failed counts

Repeated ingestion does not create duplicate measurements.

Current Space Weather

Added:

GET /api/space-weather/current

The endpoint returns:

Latest stored Kp observation
Observation timestamp
Ingestion timestamp
Current, delayed, or stale status
NOAA G1–G5 interpretation
Supporting NOAA facts
Plain-English explanation
Frontend

Added a global Space Weather card that:

Loads automatically
Displays the latest Kp value
Displays NOAA storm level
Displays observation freshness
Displays station count and running a-index
Remains visible when city forecast requests fail

The original city forecast and stargazing-score flow remains functional.

Testing

Added backend tests for:

NOAA client behavior
NOAA parser behavior
Deduplication keys
Kp thresholds
Freshness rules
Current response construction
FastAPI route behavior

Added frontend tests for:

Loading state
Error state
Data state
Automatic NOAA loading
City forecast interaction
City-error isolation
Current Architecture
React frontend
    |
    v
FastAPI
    |
    +--> Open-Meteo forecast service
    |
    +--> PostgreSQL
            |
            +--> NOAA Kp measurements
            +--> API fetch logs

Manual ingestion
    |
    v
NOAA SWPC
    |
    v
Client
    |
    v
Pydantic validation
    |
    v
Normalization
    |
    v
PostgreSQL
Verified Behaviors
PostgreSQL starts and stops without data loss
Database outage does not indefinitely hang /health
Alembic can rebuild the schema
NOAA client handles network and source errors
Repeated NOAA ingestion skips duplicates
Failed ingestion attempts are logged
Current-space-weather endpoint reads the newest observation
Read-only requests do not create fetch logs
Existing forecast behavior still works
Frontend production build succeeds
Automated backend and frontend tests pass
Known Limitations
NOAA ingestion is manual
The administration ingestion route is unauthenticated
Only the observed Planetary K-index source is integrated
Corrected NOAA records are skipped instead of updated
Space weather is global and not a local aurora forecast
Location records are not yet persisted
NASA APOD may fail when using DEMO_KEY
Frontend API base URL remains hard-coded for local development
Location disambiguation is not yet implemented
Next Milestone Candidates
Scheduled NOAA ingestion
Authentication for administration endpoints
Location persistence
Historical Kp charts
Local aurora-potential scoring
Improved frontend error and empty states
Deployment configuration
Continuous integration