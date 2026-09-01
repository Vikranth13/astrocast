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

A Bruno request collection covering every route, including deliberate failure cases, is in `docs/api-collection/`.

## Design Notes

Three properties are worth knowing before reading the route list.

**Space-weather reads are served from storage.** `/api/space-weather/*` queries PostgreSQL and never calls NOAA. Ingestion is a separate, explicit action. This keeps the frontend fast, avoids hammering NOAA, and means these endpoints keep working during an upstream outage.

**Interpretation is deterministic.** Risk levels, geomagnetic classifications, and explanations come from rule engines with documented thresholds. No language model is involved, and no explanation ever contains a value absent from the structured response.

**Errors share one envelope.** Every non-success response has the same shape, whatever raised it.

## Error Format

```json
{
  "error": {
    "code": "not_found",
    "message": "Space-weather alert was not found.",
    "details": null
  }
}
```

| Field | Meaning |
|---|---|
| `code` | Stable machine-readable identifier. Branch on this, not on the message. |
| `message` | Human-readable summary. Wording may change between releases. |
| `details` | Extra structure where useful, otherwise `null`. Validation errors put per-field information here. |

Codes currently in use:

| Code | Status | Raised when |
|---|---|---|
| `bad_request` | 400 | The request is well-formed but semantically invalid, such as a reversed date range. |
| `not_found` | 404 | The route or the requested record does not exist. |
| `validation_error` | 422 | A query parameter failed validation. `details` names the field. |
| `internal_error` | 500 | An unexpected failure. Deliberately generic. |
| `database_error` | 500 | Ingestion reached NOAA but could not persist the result. |
| `upstream_unavailable` | 502 | NOAA could not be reached during an ingestion run. |

Internal failures are logged with their traceback on the server and reported generically to the client. Exception text, connection details, and tracebacks are never returned in a response.

## Route Summary

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Confirms the backend is running |
| GET | `/health` | Backend and database health |
| GET | `/geocode?city=` | Converts a city name into location data |
| GET | `/forecast?city=` | Local stargazing forecast and score |
| GET | `/apod` | NASA Astronomy Picture of the Day |
| GET | `/api/space-weather/current` | Newest stored Kp observation |
| GET | `/api/space-weather/risk` | Deterministic risk assessment |
| GET | `/api/space-weather/alerts` | Filterable alert list |
| GET | `/api/space-weather/alerts/{id}` | One alert with an explanation |
| GET | `/api/space-weather/trends/kp` | Kp time series |
| GET | `/api/space-weather/trends/solar-wind` | Solar-wind time series |
| POST | `/api/admin/ingestion/noaa` | Run Kp ingestion |
| POST | `/api/admin/ingestion/noaa/alerts` | Run alert ingestion |
| POST | `/api/admin/ingestion/noaa/solar-wind` | Run solar-wind ingestion |

## System

### `GET /health`

```json
{
  "status": "ok",
  "database": "ok"
}
```

`database` is `unavailable` when PostgreSQL cannot be reached. The application still starts in that state so the external-API forecast routes remain usable.

## Local Observing

### `GET /geocode`

| Parameter | Type | Required | Validation |
|---|---|---|---|
| `city` | string | Yes | Minimum length 2 |

Returns name, region, country, latitude, longitude, and timezone. Only the first matching result is returned; cities sharing a name are not yet disambiguated.

### `GET /forecast`

| Parameter | Type | Required | Validation |
|---|---|---|---|
| `city` | string | Yes | Minimum length 2 |

Returns `location`, `forecast_time`, `conditions` (cloud cover, precipitation probability, temperature, wind speed, visibility), and `stargazing` (score, rating, explanation).

This route calls Open-Meteo live, so it is the one place a network failure is visible to the user. Upstream failures return 502.

### `GET /apod`

NASA Astronomy Picture of the Day. Returns 502 when NASA fails, which is common with the shared `DEMO_KEY`.

## Space Weather

### `GET /api/space-weather/current`

The newest stored planetary K-index observation.

```json
{
  "source": "NOAA_SWPC",
  "metric_name": "planetary_k_index",
  "observed_at": "2026-09-01T00:00:00Z",
  "ingested_at": "2026-09-01T03:04:35.859269Z",
  "freshness": {
    "status": "current",
    "age_minutes": 191
  },
  "geomagnetic_activity": {
    "level": "below_storm",
    "label": "Below geomagnetic storm level",
    "noaa_scale": null,
    "is_storm": false
  },
  "facts": {
    "kp": 1.0,
    "a_running": 4,
    "station_count": 8
  },
  "explanation": "The planetary K-index is 1.00, which is below the NOAA G1 geomagnetic storm threshold. The observation is approximately 3 hours old and AstroCast classifies the source data as current.",
  "explanation_detail": {
    "summary": "The planetary K-index is 1.00, which is below the NOAA G1 geomagnetic storm threshold.",
    "details": [
      "Activity is below storm level, so aurora is unlikely to extend beyond the usual high-latitude auroral zone. Geomagnetic activity alone does not establish whether aurora will be visible from a specific place. Local visibility also depends on geomagnetic latitude, hours of darkness, and cloud cover, none of which are included in this assessment.",
      "The observation is approximately 3 hours old and AstroCast classifies the source data as current."
    ],
    "caveats": [
      "AstroCast output is informational and depends on the accuracy and timeliness of the NOAA source data."
    ]
  }
}
```

`explanation` is a flat string kept for the existing frontend card. `explanation_detail` carries the structured version and is the field new clients should use.

Freshness thresholds: `current` up to 4 hours, `delayed` up to 12 hours, `stale` beyond that.

Returns 404 with code `not_found` before the first ingestion run.

### `GET /api/space-weather/risk`

Deterministic risk assessment. Returns `raw_values` (the measurements and their observation times), `risk` (level, contributing factors, rule ids), and `explanation`.

Levels are `low`, `moderate`, `high`, and `severe`. Kp is the primary signal. Solar-wind speed and density are supporting conditions that can raise the level conservatively but cannot on their own produce `severe`.

Each contributing factor carries the `rule_id` that produced it, so an assessment can be traced back to the rule that caused it.

Returns 404 when no Kp measurement is stored.

### `GET /api/space-weather/alerts`

Stored NOAA notifications, newest first. Filters combine with AND.

| Parameter | Type | Notes |
|---|---|---|
| `severity` | enum | `G1`–`G5` geomagnetic, `R1`–`R5` radio blackout, `S1`–`S5` solar radiation |
| `type` | enum | `alert`, `warning`, `watch`, `summary`, `cancellation`, `other` |
| `source` | enum | `NOAA_SWPC` |
| `issued_start` | datetime | ISO 8601, inclusive |
| `issued_end` | datetime | ISO 8601, inclusive |
| `status` | enum | `active`, `expired`, `unknown` |
| `limit` | int | 1–500, default 100 |

`status` is derived from the stored expiry time. NOAA does not always supply one; those alerts are `unknown` rather than being guessed at.

An invalid enum value returns 422 with the field named in `details`. An `issued_start` later than `issued_end` returns 400 rather than an empty list.

### `GET /api/space-weather/alerts/{alert_id}`

One alert, with a deterministic `explanation` object the list endpoint omits. The explanation names the event family implied by the severity prefix and states plainly when the status cannot be determined from stored data.

Returns 404 with code `not_found` for an unknown id.

### `GET /api/space-weather/trends/kp`

Chart-ready points ordered by observation time.

| Parameter | Type | Notes |
|---|---|---|
| `start` | datetime | ISO 8601, inclusive |
| `end` | datetime | ISO 8601, inclusive |
| `limit` | int | 1–2000, default 500 |

```json
{
  "source": "NOAA_SWPC",
  "metric_name": "planetary_k_index",
  "unit": "index",
  "count": 2,
  "points": [
    { "observed_at": "2026-08-31T21:00:00Z", "value": 1.33 },
    { "observed_at": "2026-09-01T00:00:00Z", "value": 1.0 }
  ]
}
```

### `GET /api/space-weather/trends/solar-wind`

Same parameters. Each point groups the speed, density, and temperature measurements recorded for one observation time, with the reporting station where NOAA supplies it.

## Administration

Three routes trigger ingestion manually. They are development tools, they are **not authenticated**, and they must not be exposed publicly in their current form.

| Route | Source |
|---|---|
| `POST /api/admin/ingestion/noaa` | Planetary K-index |
| `POST /api/admin/ingestion/noaa/alerts` | Alert notifications |
| `POST /api/admin/ingestion/noaa/solar-wind` | Real-time solar wind |

All three return the same summary:

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

| Field | Meaning |
|---|---|
| `fetched` | Raw records NOAA returned |
| `normalized` | Logical records after validation, filtering, and supersede resolution |
| `inserted` | Normalized rows newly stored |
| `skipped` | Normalized rows already stored |
| `failed` | Normalized rows that could not be processed |

The invariant, for every source:

```text
normalized = inserted + skipped
```

`fetched` is deliberately not part of that equation. The difference between `fetched` and `normalized` shows what normalization did, and it is signed:

- **Alerts collapse.** NOAA reissues a notification under the same serial number when it is corrected, and only the newest version survives parsing. A run fetching 75 rows may normalize to 73. Those two rows were superseded, not rejected as duplicates.
- **Solar wind expands.** One reading yields separate speed, density, and temperature measurements, so 3521 source rows can normalize to 4092. A successful first run legitimately stores more rows than it fetched.
- **Kp is one to one**, so the two values match.

A repeat run should insert 0 and skip everything, with `normalized` unchanged.

### Failure behaviour

An unreachable NOAA returns 502 with code `upstream_unavailable`, and the attempt is still recorded in `api_fetch_logs` with status `failed`. The response message is fixed; the underlying exception is logged server-side only.

Every attempt writes a fetch log, successful or not. `normalized_count` on that log is zero when the run failed before parsing, and the real count when parsing had finished and a later step failed.

Crucially, a failed ingestion does not affect reads. `/current`, `/risk`, and both trend routes continue to serve stored data throughout, which is why none of them document a 502.
