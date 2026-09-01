# AstroCast Handoff — State at End of Week 3

This describes what exists now. It is a starting point for Week 4, not a record of how the code got here.

Companion documents: `docs/api.md` (full API reference), `docs/database.md` (schema), `docs/testing.md` (how to run everything), `docs/backlog.md` (what is next).

## Current State

The backend is feature-complete for the Week 3 scope: a queryable space-weather API served from PostgreSQL, with deterministic interpretation and a uniform error contract.

| | |
| --- | --- |
| Branch | `feature/week-3-space-weather-api`, not merged to `main` |
| Backend tests | 167 passing |
| Frontend tests | 6 passing |
| Migration head | `0dc8d08221c3` |
| API version | `0.3.0` |

The frontend is still the Week 1 single-page view plus one space-weather card. It consumes exactly two endpoints: `/forecast` and `/api/space-weather/current`. Everything else the backend exposes is unused by the UI so far.

## Architecture

Request flow, strictly one direction:

```text
HTTP
 -> Route        api/routes/       HTTP contracts and dependency injection
 -> Service      services/         application workflow and scientific logic
 -> Repository   repositories/     all PostgreSQL queries
    or Client    clients/          external API communication
 -> PostgreSQL / NOAA
```

Supporting layers: `parsers/` for source-specific validation and normalization, `schemas/` for Pydantic request and response contracts, `models/` for SQLAlchemy tables.

Two rules hold throughout and should continue to:

- **Routes never touch the database.** They declare the contract, resolve `get_db`, and delegate.
- **ORM objects never leave the service layer.** Responses are Pydantic DTOs.

```text
backend/
|-- api/
|   |-- errors.py                  global exception handlers
|   `-- routes/                    system, observe, astronomy, space_weather, admin_ingestion
|-- clients/noaa_swpc_client.py    NOAA HTTP with timeout and retries
|-- parsers/                       noaa_kp_parser, noaa_alert_parser, noaa_solar_wind_parser
|-- repositories/                  fetch_log, space_weather, space_weather_alert
|-- services/                      space_weather, space_weather_risk, explanation, noaa_ingestion,
|                                  weather, astronomy, scoring
|-- schemas/                       space_weather, ingestion, errors, noaa_*, normalized_*
|-- models/                        location, space_weather_measurement, space_weather_alert,
|                                  api_fetch_log
`-- alembic/versions/
```

## Endpoints

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/` | Liveness |
| GET | `/health` | Backend plus database status |
| GET | `/geocode?city=` | Open-Meteo geocoding, live call |
| GET | `/forecast?city=` | Local forecast and stargazing score, live call |
| GET | `/apod` | NASA APOD, live call |
| GET | `/api/space-weather/current` | Newest stored Kp observation |
| GET | `/api/space-weather/risk` | Deterministic risk assessment |
| GET | `/api/space-weather/alerts` | Filterable alert list |
| GET | `/api/space-weather/alerts/{alert_id}` | One alert, with explanation |
| GET | `/api/space-weather/trends/kp` | Kp time series |
| GET | `/api/space-weather/trends/solar-wind` | Solar-wind time series |
| POST | `/api/admin/ingestion/noaa` | Run Kp ingestion |
| POST | `/api/admin/ingestion/noaa/alerts` | Run alert ingestion |
| POST | `/api/admin/ingestion/noaa/solar-wind` | Run solar-wind ingestion |

**Every `/api/space-weather/*` route reads stored data and never calls NOAA.** They stay available during an upstream outage, which is why none of them documents a 502.

The three live-call routes (`/geocode`, `/forecast`, `/apod`) are the only places an external failure is visible to a user.

### Filters

`/api/space-weather/alerts` accepts `severity`, `type`, `source`, `issued_start`, `issued_end`, `status`, and `limit` (1–500, default 100). Filters combine with AND. Both trend routes accept `start`, `end`, and `limit` (1–2000, default 500).

Invalid enum values return 422 naming the field. `issued_start` later than `issued_end` returns 400 rather than an empty list.

A Bruno collection covering every route plus deliberate failure cases is in `docs/api-collection/`. It is plain text and reviews in git.

## NOAA Sources

| Product | URL | Shape |
| --- | --- | --- |
| Planetary K-index | `services.swpc.noaa.gov/products/noaa-planetary-k-index.json` | One measurement per source record |
| Alerts | `services.swpc.noaa.gov/products/alerts.json` | Source records can collapse during parsing |
| Real-time solar wind | `services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json` | One record yields up to three measurements |

All three are configurable through environment variables (`NOAA_PLANETARY_K_INDEX_URL`, `NOAA_ALERTS_URL`, `NOAA_SOLAR_WIND_URL`). Environment variables take precedence over `.env`, which is how the outage drill in `docs/testing.md` works without editing any file.

Solar wind splits each reading into `solar_wind_speed`, `solar_wind_density`, and `solar_wind_temperature`, stored as separate measurement rows sharing an observation time.

Alerts carry an `external_id` of `product_id:serial_number`, falling back to `product_id:issued_at` when the message has no serial. NOAA reissues corrected notifications under the same serial; the parser keeps only the newest version per `external_id`.

## Database and Migrations

Tables: `locations`, `space_weather_measurements`, `space_weather_alerts`, `api_fetch_logs`.

| Revision | Contents |
| --- | --- |
| `e2461684f17c` | Initial schema |
| `0dc8d08221c3` | Adds `api_fetch_logs.normalized_count`, backfills existing successful rows |

`0dc8d08221c3` is head and `alembic check` reports no drift. Both migrations define a `downgrade()`; the initial revision has been exercised through a full upgrade, downgrade, and re-upgrade cycle, `0dc8d08221c3` has not. Note that downgrading it drops `normalized_count` and its backfilled values are not recoverable.

`locations` exists but is not yet written to. City searches are not persisted.

### Deduplication

Uniqueness is `(source, deduplication_key)` on both measurements and alerts. Keys are SHA-256 over a canonical string, so they are stable across runs and machines:

| Entity | Key material |
| --- | --- |
| Kp measurement | source, metric name, observation time |
| Solar-wind measurement | source, spacecraft, metric name, observation time |
| Alert | source, external id |

Inserts use an ignore-duplicates strategy, so a repeated ingestion is safe and cheap.

### Fetch logs

Every ingestion attempt writes one `api_fetch_logs` row, successful or not, with timing, HTTP status, counters, and an error message where relevant. There is no deduplication constraint on this table by design.

## Ingestion Semantics

This is the part most likely to be misread, so it is worth reading before touching ingestion or displaying counters in the UI.

| Field | Meaning |
| --- | --- |
| `fetched` | Raw records NOAA returned |
| `normalized` | Logical records after validation, filtering, and supersede resolution |
| `inserted` | Normalized rows newly stored |
| `skipped` | Normalized rows already stored |
| `failed` | Normalized rows that could not be processed |

The invariant for a successful run, uniform across all three sources:

```text
normalized = inserted + skipped
```

**`fetched` is deliberately outside that equation.** Normalization is not one to one, and the difference between `fetched` and `normalized` is signed:

- **Alerts collapse.** 75 source rows may normalize to 73 because two notifications were superseded. Those are not duplicates and must never be reported as skipped.
- **Solar wind expands.** 3521 source rows may normalize to 4092 measurements. A first run legitimately stores more rows than it fetched.
- **Kp matches**, being one to one.

`failed` is always 0 today. Partial-record processing is not implemented; a parse failure aborts the run.

`normalized_count` on a fetch log is 0 when a run failed before parsing, and the real count when parsing completed and a later step failed.

## Risk and Explanation Logic

Both engines are deterministic and rule-based. No language model is involved anywhere in the pipeline.

### Classification

`services/space_weather_risk_service.py` maps Kp to a NOAA geomagnetic scale. Thresholds account for the third-step decimals NOAA publishes:

| Scale | Kp at or above |
| --- | --- |
| G1 minor | 4.67 |
| G2 moderate | 5.67 |
| G3 strong | 6.67 |
| G4 severe | 7.67 |
| G5 extreme | 9.00 |

Below 4.67 is `below_storm`.

### Risk levels

`low`, `moderate`, `high`, `severe`. Kp is the primary signal: below G1 is low, G1–G2 moderate, G3 high, G4–G5 severe.

Solar-wind speed at or above 500 km/s and density at or above 10 per cm³ are *supporting* conditions. When both are elevated together they raise the level by one step, but they can never produce `severe` on their own.

Every assessment returns `contributing_factors`, each carrying the `rule_id` that produced it (`KP_G1_G2`, `SW_SPEED_ELEVATED`, `SW_FAST_DENSE_ESCALATION`, and so on), so any level can be traced to the rule responsible.

Raw measurements stay in `raw_values`, separate from the interpretation in `risk`.

### Freshness

Measured against the observation time: `current` up to 240 minutes, `delayed` up to 720, `stale` beyond that.

### Explanations

`services/explanation_service.py` is a pure module — no database, no HTTP, no clock. Anything time-dependent is passed in. This is what makes every template reproducible and testable.

It produces templates for Kp, solar wind, alerts, aurora implications, and NOAA technology impacts, assembled into a `SpaceWeatherExplanation` with `summary`, `details`, and `caveats`.

Three properties matter and are enforced by tests:

- **It never derives a classification.** Geomagnetic activity and risk level are passed in by the risk engine and only described. The prose cannot disagree with the numbers.
- **The aurora caveat is unconditional.** Every aurora statement, at every activity level, states that geomagnetic activity alone cannot establish local visibility without latitude, darkness, and cloud cover.
- **Missing data produces a caveat, not a sentence.** With no stored solar wind, the explanation says the assessment rests on Kp alone rather than inventing prose.

## Errors and Resilience

### Error contract

Every non-success response, whatever raised it, uses one envelope:

```json
{
  "error": {
    "code": "not_found",
    "message": "Space-weather alert was not found.",
    "details": null
  }
}
```

Branch on `code`; message wording may change. Codes in use: `bad_request` (400), `not_found` (404), `validation_error` (422, with per-field information in `details`), `internal_error` and `database_error` (500), `upstream_unavailable` (502).

Handlers live in `api/errors.py` and are registered once in `main.py`. Routes do not catch and map exceptions themselves; adding a route means the contract applies automatically.

**Internal detail never reaches a response.** Unexpected errors are logged with their traceback and reported generically. Upstream failures return a fixed message; the underlying exception, which carries connection internals and library object reprs, goes to the log only. Tests assert this.

### Retries

`clients/noaa_swpc_client.py` retries transient failures with exponential backoff: 15 second timeout, 2 retries, 0.5 second base delay doubling each attempt.

Retryable: connection errors, timeouts, and HTTP 429, 500, 502, 503, 504.

**Not retryable:** any other 4xx, malformed JSON, or a wrong payload shape. Those are deterministic; retrying only burns the timeout budget before reporting the same error.

The sleep function is constructor-injected so tests run instantly.

### Outage behaviour

Verified against live PostgreSQL: with NOAA unreachable, ingestion returns 502 and records a `failed` fetch log, while `/current`, `/risk`, and both trend routes continue to return 200 from stored data. The drill is written up in `docs/testing.md` and takes about a minute to repeat.

## Tests

| Suite | Count |
| --- | --- |
| Backend | 167 |
| Frontend | 6 |

| File | Tests | Covers |
| --- | ---: | --- |
| `test_explanation_service.py` | 42 | Templates, determinism, mandatory caveats |
| `test_space_weather_risk_service.py` | 30 | Classification and risk threshold boundaries |
| `test_space_weather_service.py` | 30 | Freshness, response construction, alert status, trends |
| `test_api_routes.py` | 21 | Route behaviour and error mapping |
| `test_noaa_client.py` | 12 | HTTP behaviour, retry policy, backoff |
| `test_error_handling.py` | 11 | Envelope shape, detail suppression, outage resilience |
| `test_noaa_ingestion_counters.py` | 8 | Counter reconciliation, supersede case, failure paths |
| `test_noaa_kp_parser.py` | 6 | Kp validation, UTC normalization, dedup keys |
| `test_noaa_alert_parser.py` | 4 | Alert parsing, severity and type, supersede |
| `test_noaa_solar_wind_parser.py` | 3 | Solar-wind parsing and metric expansion |

Run: `venv/Scripts/python.exe -m pytest -q` from `backend/`, `npm test` from `frontend/`. Lint with `python -m flake8 --select=F --exclude=venv,alembic .` (currently clean).

No test calls NOAA or writes to PostgreSQL. External responses are faked and FastAPI dependencies overridden. Time and sleep are injected, never real.

## Decisions to Preserve

These are load-bearing. Changing any of them means changing a contract or breaking a guarantee something else depends on.

**1. `CurrentSpaceWeatherResponse.explanation` is a flat string, and `explanation_detail` is the structured object.** The current frontend card renders `explanation` directly, and `App.test.tsx` asserts on it. Both fields are populated. Week 4 should move the card to `explanation_detail`, rendering `caveats` visually distinct from `details` — then, and only then, is dropping the flat string a safe follow-up.

**2. Space-weather reads never call NOAA.** This is what keeps the app usable during an outage and what keeps the frontend fast. Adding a live NOAA call inside a `GET /api/space-weather/*` handler would silently undo it. Ingestion is the only path that talks to NOAA.

**3. Interpretation is deterministic.** Risk levels and explanations come from rule engines with stated thresholds. An AI layer, if ever added, may only rephrase already-validated facts. It must never produce a measurement, a risk level, or an alert.

**4. The aurora caveat is not optional.** Tests assert it appears at every activity level. Kp alone cannot establish local visibility.

**5. Counters reconcile on `normalized`, not `fetched`.** Any UI showing ingestion results should present `normalized = inserted + skipped` and treat the gap to `fetched` as a normalization effect, not an error.

**6. The error envelope is the contract.** New routes should not catch and translate exceptions locally; let the global handlers do it, and document the codes a route can produce via `responses=`.

**7. Retries cover transient failures only.** Do not widen the retryable set to 4xx or malformed payloads.

**8. Timestamps are UTC end to end.** Storage, comparison, and API output are all timezone-aware UTC. `ensure_utc` normalizes anything entering the service layer.

## Known Limitations

- Ingestion is manual. There is no scheduler.
- **The three admin ingestion routes are unauthenticated.** They must not be exposed publicly as they stand.
- Only the frontend's forecast and current-space-weather calls are wired. Alerts, trends, and risk are served but unused.
- City search takes the first geocoding result; cities sharing a name are not disambiguated.
- The forecast evaluates a fixed evening hour rather than the next real observing window.
- `locations` is never written to.
- Corrected NOAA *measurements* are skipped rather than updated. Corrected *alerts* are handled correctly by supersede resolution.
- Space-weather output is global geomagnetic activity, not a location-specific aurora forecast.
- `failed_count` is always 0; a parse failure aborts the whole run.
- Historical alert rows backfilled by `0dc8d08221c3` inherit an earlier counter overstatement and can read slightly high. Rows written after that migration are correct.
- NASA APOD often fails on the shared `DEMO_KEY`.
- The frontend API base URL is hardcoded for local development.
- No deployment, no CI, no Docker image for the backend.
- Three Week 2 documents (`current-space-weather.md`, `noaa-ingestion.md`, `noaa-kp-source.md`) are truncated mid-sentence and need rewriting.

## Deferred Backlog

Full list in `docs/backlog.md`. The items most likely to matter soon:

| Item | Target |
| --- | --- |
| Switch the space-weather card to `explanation_detail` | Week 4, first task touching Week 3 output |
| Multi-page frontend, design system, Recharts on mock data | Week 4 |
| Typed API clients generated from the OpenAPI schema | Week 5 |
| Authenticate the ingestion routes | Should |
| Scheduled ingestion | Should |
| Persist searched locations, disambiguate city names | Should |
| Structured backend logging | Should |
| Replace `requirements.txt` with a runtime dependency list | Week 8, before Docker |
| Partial-record ingestion so `failed_count` is meaningful | Later |

`backend/requirements.txt` is currently a full environment freeze pinning jupyter, streamlit, scikit-learn, matplotlib, seaborn, folium, and pyarrow. None are imported by AstroCast. It will produce a very large Docker image and slow CI, so it should be trimmed before Week 8 containerization rather than during it.

## Starting Week 4

```cmd
docker compose start postgres
cd backend
venv\Scripts\activate
python -m alembic upgrade head
python -m pytest -q
python -m uvicorn main:app --reload
```

Then `cd frontend && npm install && npm run dev`.

Week 4 is a frontend week built on mock data first, so no backend endpoint is on its critical path. The backend contract above should be treated as stable for the week.
