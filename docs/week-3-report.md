# Week 3 Progress Report

**Week goal.** Turn the initial ingestion proof into a clean, queryable backend supporting current status, alerts, event details, trends, filters, and reliable error handling.

**Branch.** `feature/week-3-space-weather-api`

## Completed functionality

Days 1 through 4 established the architecture and the query surface: clients, repositories, services, schemas, and routes were separated; database access was removed from route functions; response DTOs replaced ORM objects; alert list and detail endpoints gained filters and 404 handling; Kp and solar-wind trend endpoints were added with start, end, and limit parameters; and the risk engine gained Low, Moderate, High, and Severe thresholds with contributing factors and rule identifiers.

Days 5 through 7 completed the week:

**Explanation engine.** A pure module with no database, HTTP, or clock access, producing plain-English templates for Kp, solar wind, alerts, aurora implications, and NOAA technology impacts. It never derives a classification of its own — geomagnetic activity and risk level are passed in by the risk engine and only described — so the prose cannot drift from the numbers. Caveats attach where stored data cannot support a conclusion, and the aurora caveat is unconditional.

**Error handling.** One envelope for every failure, with a stable machine-readable code. Handlers cover raised HTTP exceptions, request validation, the NOAA client and ingestion error families, and a catch-all. Unexpected errors are logged with their traceback and reported generically.

**Resilience.** NOAA requests retry transient failures with exponential backoff. Deterministic failures are not retried. Read endpoints serve stored data and never call NOAA.

**Verification.** A Bruno collection covers every route plus deliberate failure cases; OpenAPI carries filter descriptions and error models; `docs/api.md` was rewritten from its Week 1 state.

## Backend progress

New: `services/explanation_service.py`, `api/errors.py`, `schemas/errors.py`.

Changed: the three admin ingestion routes lost their duplicated try/except blocks now that handlers are central; `clients/noaa_swpc_client.py` gained a bounded retry loop with injected sleep; `models/api_fetch_log.py` gained `normalized_count`.

## Frontend progress

None by design. Week 3 is a backend week. The existing space-weather card was deliberately kept working: `CurrentSpaceWeatherResponse.explanation` was preserved as a flat string and `explanation_detail` added alongside it, so the frontend suite passed unchanged throughout.

## Database and ingestion progress

Migration `0dc8d08221c3` adds `api_fetch_logs.normalized_count` and backfills existing successful rows.

This came out of a defect found while verifying duplicate ingestion. Ingestion had no well-defined reconciliation value, and each service papered over that differently. Solar wind derived `skipped` from normalized measurements while reporting fetched source rows, so a successful run recorded inserting 3948 records after fetching 3668. Alerts instead derived `skipped` as `fetched - inserted`, which forced the totals to reconcile and quietly counted superseded notifications as skipped duplicates.

Measured on a live run before the fix:

```text
ALERTS      source rows = 75   normalized = 73   collapsed by supersede = 2
SOLAR WIND  source rows = 3521 normalized = 4092 measurements per row = 1.16
```

The alert log for that run reported `fetched=75, inserted=12, skipped=63`. Two superseded notifications were counted as duplicates.

After the fix, every source reconciles on `normalized = inserted + skipped`:

```text
OK  kp run 1                   fetched=57    normalized=57    inserted=40    skipped=17    collapsed=0
OK  kp run 2 (repeat)          fetched=57    normalized=57    inserted=0     skipped=57    collapsed=0
OK  alerts run 1               fetched=75    normalized=73    inserted=0     skipped=73    collapsed=2
OK  solar wind run 1           fetched=3521  normalized=4092  inserted=0     skipped=4092  collapsed=-571
```

`fetched - normalized` is signed and meaningful: positive where alerts collapse because a notification was superseded, negative where solar wind expands because one reading yields three measurements. Neither is a stored duplicate.

## Outage drill

Run against the live PostgreSQL instance with `NOAA_PLANETARY_K_INDEX_URL` overridden to an unreachable local port for the server process only, so no configuration file was modified.

```text
POST /api/admin/ingestion/noaa          502  upstream_unavailable
GET  /api/space-weather/current         200
GET  /api/space-weather/trends/kp       200
GET  /api/space-weather/risk            200
```

The failed attempt was recorded in `api_fetch_logs` with status `failed`, all counters zero because the run failed before parsing, and the error message stored. Normal ingestion succeeded immediately afterwards.

The drill also exposed a defect: the 502 body contained the internal host and port, a `urllib3` connection object repr with its memory address, and library stack detail, from an endpoint that is not authenticated. The ingestion handler now returns a fixed message and logs the detail, matching the NOAA client handler. A regression test asserts none of that content reaches a response.

## Tests added

Backend went from 100 to 167 passing. Frontend remained at 6, unchanged, which was the point.

| File | Covers |
| --- | --- |
| `test_explanation_service.py` | Every template, determinism, the unconditional aurora caveat across the full Kp range, and that absent solar-wind data yields no sentence |
| `test_error_handling.py` | Envelope shape per status, that internal detail is not exposed, that upstream exception text is not echoed, and outage resilience |
| `test_noaa_ingestion_counters.py` | Counter reconciliation for all three sources, first and repeat runs, and the superseded-alert case |
| `test_noaa_client.py` | Retry on transient failures, no retry on deterministic ones, exponential backoff, retries disabled |

Two tests are worth singling out. The outage tests run the real services against a fake database with outbound HTTP disabled, so an endpoint that secretly called NOAA would fail loudly — and a control test asserts the network really is broken, so they cannot pass for the wrong reason. The superseded-alert test builds a feed containing two versions of one notification and asserts the collapse appears as the gap between `fetched` and `normalized`, never as a skipped duplicate.

## Problems and fixes

| Problem | Fix |
| --- | --- |
| Ingestion counters did not reconcile, differently per source | Added `normalized_count` as the single reconciliation value across all three services |
| Superseded alerts reported as skipped duplicates | Alerts now derive `skipped` from normalized records like the other sources |
| 502 responses echoed upstream exception text | Fixed client message; full detail logged server-side |
| `normalized_count` was zero after a database failure | Assigned as soon as parsing completes, so failures record work done |
| Adding retries slowed the suite from 3.6s to 6.5s | Injected the sleep function; suite is now faster than the original baseline |
| `docs/api.md` described shipped routes as "planned" | Rewritten |

## Definition of done

| Item | Status |
| --- | --- |
| Alerts list and detail endpoints work | Pass |
| At least one trend endpoint returns historical points | Pass — two |
| Risk classification and explanations deterministic and tested | Pass |
| Filters and validation work | Pass |
| Global errors use a consistent JSON shape | Pass |
| Stored data remains available when an external API fails | Pass — verified against live PostgreSQL |
| A request collection covers the main endpoints | Pass — Bruno, including failure cases |

Scope-control warnings were respected: no AI is involved in risk classification, no ORM objects are exposed, and read endpoints never call NOAA.

## Deferred

Trimming `backend/requirements.txt` from a full `pip freeze` to a runtime dependency list, moved to Week 8. Authentication for the ingestion routes and scheduled ingestion remain in Should.

## Next week objective

Week 4: multi-page frontend and visual system, built against mock data so layout work does not depend on further backend changes. The first task that touches this week's output is switching the space-weather card from the flat `explanation` string to `explanation_detail`, rendering caveats distinctly from details.
