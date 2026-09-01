# AstroCast Testing

## Overview

AstroCast has separate backend and frontend suites. The backend uses pytest; the frontend uses Vitest with jsdom and React Testing Library.

Current state:

| Suite | Tests |
| --- | --- |
| Backend | 167 passing |
| Frontend | 6 passing |

## Backend Tests

Located under `backend/tests/`.

| File | Covers |
| --- | --- |
| `test_noaa_client.py` | HTTP client behaviour, invalid HTTP and JSON responses, retry and backoff policy |
| `test_noaa_kp_parser.py` | Kp source validation, UTC normalization, deterministic deduplication keys |
| `test_noaa_alert_parser.py` | Alert parsing, severity and type extraction, supersede resolution |
| `test_noaa_solar_wind_parser.py` | Solar-wind parsing and per-metric expansion |
| `test_noaa_ingestion_counters.py` | Counter reconciliation across all three sources, first and repeat runs, superseded alerts, failure paths |
| `test_space_weather_risk_service.py` | Kp classification and risk threshold boundaries |
| `test_space_weather_service.py` | Freshness thresholds, response construction, alert status, trends |
| `test_explanation_service.py` | Explanation templates, determinism, mandatory caveats |
| `test_error_handling.py` | Error envelope shape, internal-detail suppression, outage resilience |
| `test_api_routes.py` | FastAPI route behaviour and error mapping |

### Running

From `backend/`:

```cmd
venv\Scripts\activate
python -m pytest
```

Verbose, and with coverage:

```cmd
python -m pytest -v
python -m pytest --cov=clients --cov=parsers --cov=services --cov-report=term-missing
```

Unused-import and undefined-name checks:

```cmd
python -m flake8 --select=F --exclude=venv,alembic .
```

Backend tests use fake HTTP responses and FastAPI dependency overrides. They do not call NOAA and do not modify PostgreSQL.

## Frontend Tests

Located under `frontend/src/`. They cover the space-weather loading, error, and success states, automatic loading on startup, city forecast interaction, and preservation of global NOAA data after a failed city search.

From `frontend/`:

```cmd
npm install
npm test
npm run test:watch
npm run lint
npm run build
```

## Testing Principles

**Tests must be deterministic.** A unit test should never fail because NOAA, Open-Meteo, Docker, or the internet is temporarily unavailable. Real integrations are verified separately through the manual checks below.

**A test that cannot fail is not a test.** The outage tests run the real services against a fake database with outbound HTTP disabled, so an endpoint that secretly called NOAA would fail loudly. They are paired with a control test asserting the network really is unreachable — without it, a broken fixture would let them pass for the wrong reason.

**Time and sleep are injected, never real.** Explanation and freshness functions take `now` as an argument, and the NOAA client takes its sleep function, so retry tests finish instantly. Adding retries without this slowed the suite by 80 percent.

## Manual Integration Checks

Automated tests do not replace end-to-end verification. Before closing a milestone:

```cmd
docker compose start postgres
cd backend
python -m alembic upgrade head
python -m alembic check
python -m uvicorn main:app --reload
```

Then confirm:

- `GET /health` reports both backend and database as ok.
- `GET /forecast?city=...` returns a score.
- Ingestion run twice per source. Every run satisfies `normalized = inserted + skipped`, and the second inserts 0.
- `GET /api/space-weather/current` returns populated `explanation_detail.caveats`.
- `GET /api/space-weather/alerts?severity=NOPE` returns 422 in the error envelope.
- `GET /api/space-weather/alerts/999999` returns 404 in the error envelope.
- The frontend loads real NOAA data, and an invalid city search does not remove the space-weather card.
- The browser console has no unexpected errors.

The Bruno collection in `docs/api-collection/` covers all of these, including the failure cases.

### Outage drill

The Week 3 definition of done requires stored data to remain available when NOAA fails. Point the NOAA URL at a local port with nothing listening, so the connection is refused immediately rather than waiting through timeouts. The environment variable takes precedence over `.env`, so no file needs editing:

```cmd
set NOAA_PLANETARY_K_INDEX_URL=http://127.0.0.1:9/nothing-listening
python -m uvicorn main:app --port 8099
```

Expected:

- `POST /api/admin/ingestion/noaa` returns 502 with code `upstream_unavailable`, and the message contains no connection internals.
- A row appears in `api_fetch_logs` with status `failed`.
- `GET /api/space-weather/current`, `/risk`, and both trend routes still return 200.

Stop the process and confirm normal ingestion succeeds again.
