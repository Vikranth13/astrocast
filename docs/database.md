# AstroCast Database

## Overview

AstroCast uses PostgreSQL as its persistent relational database.

SQLAlchemy defines the database models in Python, while Alembic creates and versions the physical PostgreSQL schema.

The database currently contains four application tables:

* `locations`
* `space_weather_alerts`
* `space_weather_measurements`
* `api_fetch_logs`

Alembic also maintains an `alembic_version` table to track the currently applied migration revision.

## Schema Management

Database tables must be created and changed through Alembic migrations.

Do not use manually created tables or `Base.metadata.create_all()` as the primary schema-management method.

Common commands:

```cmd
python -m alembic current
python -m alembic history
python -m alembic upgrade head
python -m alembic downgrade -1
python -m alembic check
```

## Tables

### locations

Stores normalized locations returned by the geocoding service.

| Column       | Type      | Required | Purpose                    |
| ------------ | --------- | -------: | -------------------------- |
| `id`         | Integer   |      Yes | Primary key                |
| `name`       | String    |      Yes | City or location name      |
| `region`     | String    |       No | State, province, or region |
| `country`    | String    |       No | Country name               |
| `latitude`   | Numeric   |      Yes | Geographic latitude        |
| `longitude`  | Numeric   |      Yes | Geographic longitude       |
| `timezone`   | String    |       No | IANA timezone              |
| `created_at` | Timestamp |      Yes | Record creation time       |

Constraint:

```text
UNIQUE(latitude, longitude)
```

This prevents the same coordinate pair from being stored repeatedly.

### space_weather_alerts

Stores normalized alerts, warnings, and notices from space-weather sources.

| Column              | Type      | Required | Purpose                      |
| ------------------- | --------- | -------: | ---------------------------- |
| `id`                | Integer   |      Yes | Primary key                  |
| `source`            | String    |      Yes | Source system                |
| `external_id`       | String    |       No | Source-provided identifier   |
| `deduplication_key` | String    |      Yes | Stable normalized record key |
| `alert_type`        | String    |      Yes | Alert category               |
| `severity`          | String    |       No | Severity or risk category    |
| `issued_at`         | Timestamp |      Yes | Source issue time            |
| `expires_at`        | Timestamp |       No | Source expiration time       |
| `summary`           | Text      |      Yes | Normalized alert summary     |
| `raw_payload`       | JSONB     |      Yes | Original source record       |
| `created_at`        | Timestamp |      Yes | Database creation time       |

Deduplication constraint:

```text
UNIQUE(source, deduplication_key)
```

### space_weather_measurements

Stores normalized numeric or textual space-weather measurements.

| Column              | Type      | Required | Purpose                      |
| ------------------- | --------- | -------: | ---------------------------- |
| `id`                | Integer   |      Yes | Primary key                  |
| `source`            | String    |      Yes | Source system                |
| `deduplication_key` | String    |      Yes | Stable normalized record key |
| `metric_name`       | String    |      Yes | Internal metric name         |
| `observed_at`       | Timestamp |      Yes | Measurement observation time |
| `numeric_value`     | Numeric   |       No | Numeric measurement          |
| `text_value`        | Text      |       No | Textual measurement          |
| `unit`              | String    |       No | Measurement unit             |
| `station`           | String    |       No | Source station or instrument |
| `raw_payload`       | JSONB     |      Yes | Original source record       |
| `created_at`        | Timestamp |      Yes | Database creation time       |

At least one of `numeric_value` or `text_value` must be present.

Deduplication constraint:

```text
UNIQUE(source, deduplication_key)
```

The table has a composite index on:

```text
metric_name, observed_at
```

This supports queries for recent values of a particular metric.

### api_fetch_logs

Stores an audit record for each external API ingestion attempt.

| Column             | Type      | Required | Purpose                   |
| ------------------ | --------- | -------: | ------------------------- |
| `id`               | Integer   |      Yes | Primary key               |
| `source`           | String    |      Yes | External source           |
| `endpoint`         | String    |      Yes | Requested endpoint        |
| `status`           | String    |      Yes | Ingestion status          |
| `started_at`       | Timestamp |      Yes | Attempt start time        |
| `completed_at`     | Timestamp |       No | Attempt completion time   |
| `duration_ms`      | Integer   |       No | Total duration            |
| `http_status_code` | Integer   |       No | External HTTP result      |
| `fetched_count`    | Integer   |      Yes | Source records received   |
| `inserted_count`   | Integer   |      Yes | New records stored        |
| `skipped_count`    | Integer   |      Yes | Duplicate records skipped |
| `failed_count`     | Integer   |      Yes | Records that failed       |
| `error_message`    | Text      |       No | Failure information       |
| `created_at`       | Timestamp |      Yes | Database creation time    |

Allowed status values:

```text
started
success
partial
failed
```

Every ingestion attempt should produce a separate fetch-log row. This table intentionally has no deduplication constraint.

## Deduplication Strategy

External data is normalized before persistence.

The parser will generate a deterministic `deduplication_key` from source fields that identify one logical record.

The database then enforces:

```text
UNIQUE(source, deduplication_key)
```

This allows repeated ingestion runs while preventing duplicate alerts or measurements.

## Raw Payload Policy

Normalized fields are used by AstroCast services and API responses.

The original source record is also preserved in a PostgreSQL `JSONB` column for:

* Auditing
* Debugging
* Reprocessing
* Source-change investigation
* Access to fields not yet normalized

Frontend components should consume normalized API responses rather than raw source payloads.

## Current Relationships

The four initial tables are independent.

Space-weather measurements and alerts represent global scientific conditions, so they do not currently reference a location.

Location relationships may be added later when local forecast history or saved locations are persisted.

## Migration Verification

The initial migration must support this sequence:

```text
Empty database
→ upgrade to head
→ downgrade to base
→ upgrade to head
```

After the final upgrade:

```cmd
python -m alembic check
```

should report:

```text
No new upgrade operations detected.
```
