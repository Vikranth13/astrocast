# AstroCast Testing

## Overview

AstroCast uses separate backend and frontend test suites.

The backend uses pytest.

The frontend uses Vitest, jsdom, and React Testing Library.

## Backend Tests

Backend tests are located under:

```text
backend/tests/

The test suite covers:

NOAA HTTP client behavior
Invalid HTTP and JSON responses
NOAA source validation
UTC timestamp normalization
Deterministic deduplication keys
Kp risk classification
Freshness thresholds
Current-space-weather response construction
FastAPI route behavior
Upstream error mapping
Install Backend Test Dependencies
cd backend
venv\Scripts\activate
python -m pip install -r requirements-dev.txt
Run All Backend Tests
python -m pytest
Run Verbose Tests
python -m pytest -v
Run Coverage
python -m pytest --cov=clients --cov=parsers --cov=services --cov-report=term-missing

Backend unit tests use fake HTTP responses and FastAPI dependency overrides.

They do not require calls to the real NOAA endpoint and should not modify PostgreSQL.

Frontend Tests

Frontend tests are located under:

frontend/src/

The frontend test suite covers:

Space-weather loading state
Space-weather error state
Space-weather success state
Automatic loading on application startup
City forecast interaction
Preservation of global NOAA data after a city-search failure
Install Frontend Dependencies
cd frontend
npm install
Run Frontend Tests
npm test
Run Watch Mode
npm run test:watch
Run Lint and Build
npm run lint
npm run build
Manual Integration Tests

Automated tests do not replace final integration checks.

Before completing a milestone, verify:

GET /health
GET /forecast
POST /api/admin/ingestion/noaa
GET /api/space-weather/current

Also verify:

PostgreSQL is healthy
Alembic is at head
Duplicate NOAA records are not stored
The frontend loads real NOAA data
Invalid city input does not remove the space-weather card
The browser console has no unexpected errors
Testing Principle

Tests should be deterministic.

A unit test should not fail simply because NOAA, Open-Meteo, Docker, or the internet is temporarily unavailable.

Real external integrations are verified separately through manual regression checks.