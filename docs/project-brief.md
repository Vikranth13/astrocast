# AstroCast Project Brief

## Product Name

AstroCast

## Product Summary

AstroCast is a full-stack astronomy and space-weather intelligence platform. It combines local weather conditions, observing-focused scoring, astronomy data, and space-weather information to help users understand both the night sky above their location and current activity in near-Earth space.

## Problem

People interested in astronomy often need to check several unrelated sources before deciding whether to observe the sky. General weather applications do not explain how conditions affect stargazing, while scientific space-weather sources can be difficult for beginners to interpret.

AstroCast brings these signals together and converts them into clear, useful information.

## Core Product Questions

AstroCast is designed to answer questions such as:

- Is tonight suitable for stargazing?
- Are clouds, rain, wind, or visibility likely to interfere?
- What local forecast time is being evaluated?
- Is current geomagnetic or solar activity elevated?
- How fresh is the source data?
- What do the scientific measurements mean in plain English?

## Product Pillars

### 1. Local Observing Intelligence

The first pillar focuses on conditions at the user's selected location.

Current Week 1 capabilities:

- City search
- City geocoding
- Hourly forecast retrieval
- Cloud-cover analysis
- Precipitation-probability analysis
- Wind analysis
- Visibility conversion
- Stargazing score from 0 to 100
- Rating: Excellent, Good, Okay, Poor, or Bad
- Plain-English explanation

### 2. Space-Weather Intelligence

The second pillar begins in Week 2.

Planned capabilities:

- Ingest one NOAA Space Weather Prediction Center source
- Normalize external records into AstroCast's internal format
- Store records in PostgreSQL
- Prevent duplicate records
- Log every ingestion attempt
- Classify current conditions with simple rules
- Return source timestamp, freshness, facts, risk level, and explanation
- Display one real space-weather card in the frontend

Future milestones may add additional sources, alerts, trends, and deeper scientific explanations.

## Target Users

- Beginner stargazers
- Amateur astronomers
- Students learning astronomy or space science
- Users interested in aurora and geomagnetic conditions
- Developers evaluating a full-stack scientific data platform

## Current User Story

As a user, I want to enter a city and receive a clear stargazing score so I can decide whether tonight is suitable for observing the sky.

## Week 2 User Story

As a user, I want to view current space-weather conditions with a simple risk classification and explanation so I can understand whether important solar or geomagnetic activity is occurring.

## Current Week 1 Flow

```text
City name
    |
    v
Open-Meteo geocoding
    |
    v
Latitude, longitude, and timezone
    |
    v
Open-Meteo hourly forecast
    |
    v
AstroCast scoring rules
    |
    v
React result cards
```

## Week 2 Target Flow

```text
NOAA SWPC source
    |
    v
Source-specific client
    |
    v
Parser and normalization
    |
    v
Ingestion service
    |
    +----> API fetch log
    |
    v
PostgreSQL
    |
    v
Current space-weather service
    |
    v
FastAPI endpoint
    |
    v
React space-weather card
```

## Scope Principles

- Preserve the existing local forecast while adding persistence.
- Use FastAPI as the backend framework.
- Use PostgreSQL and repeatable Alembic migrations.
- Integrate one NOAA source before adding more.
- Normalize source data before exposing it to the frontend.
- Keep the Week 2 frontend change small.
- Prefer clear, testable rules before complex prediction models.

## Out of Scope for Week 2

- Multiple NOAA sources
- User accounts
- Saved locations
- Notifications
- AI-generated summaries
- Historical dashboards
- Full frontend redesign
- Interactive sky maps
- Mobile applications
- Replacing FastAPI with Spring Boot
