# NOAA Planetary K-index Ingestion

## Overview

AstroCast ingests observed Planetary K-index records from NOAA Space Weather Prediction Center.

The ingestion workflow fetches, validates, normalizes, deduplicates, and stores measurements in PostgreSQL.

## Manual Endpoint

```text
POST /api/admin/ingestion/noaa