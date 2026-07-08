# AstroCast Architecture

## High-Level Flow

User
→ React Frontend
→ FastAPI Backend
→ External APIs
→ FastAPI Backend
→ React Frontend
→ Display Stargazing Score

## Components

### Frontend

The frontend allows the user to enter a city and view the forecast result.

### Backend

The backend receives the city, calls external APIs, calculates the stargazing score, and returns the result.

### External APIs

Open-Meteo provides geocoding and weather forecast data.

NASA APOD provides astronomy-related content.

## Initial Architecture

```text
[User]
   |
   v
[React Frontend]
   |
   v
[FastAPI Backend]
   |
   |----> [Open-Meteo Geocoding API]
   |
   |----> [Open-Meteo Weather API]
   |
   |----> [NASA APOD API]
   |
   v
[Stargazing Score Result]