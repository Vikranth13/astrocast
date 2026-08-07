# Current Space Weather

## Overview

AstroCast exposes the newest stored NOAA Planetary K-index measurement through a user-facing API.

The endpoint reads PostgreSQL. It does not call NOAA directly.

## Endpoint

```text
GET /api/space-weather/current