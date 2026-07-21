# AstroCast

AstroCast is a full-stack astronomy and space-weather intelligence platform that helps users understand when and where sky-observing conditions are favorable.

It combines local weather data, astronomy information, and space-weather measurements into clear forecasts, risk levels, and plain-English explanations.

## Why AstroCast

People interested in astronomy often need to check multiple sources before deciding whether to observe the sky. A general weather app may report clouds or rain, but it does not explain how those conditions affect stargazing. Scientific space-weather sources provide valuable information, but they can be difficult for beginners to interpret.

AstroCast brings these signals together in one application.

## Main Capabilities

### Local Stargazing Forecasts

Users can search for a city and receive:

* Location information
* Forecast time
* Cloud cover
* Precipitation probability
* Temperature
* Wind speed
* Visibility
* Stargazing score from 0 to 100
* Rating such as Excellent, Good, Okay, Poor, or Bad
* Plain-English explanation of the score

### Space-Weather Intelligence

AstroCast is being expanded to include:

* NOAA space-weather measurements and alerts
* Current geomagnetic or solar activity
* Rule-based risk classification
* Source timestamp and freshness
* Plain-English scientific explanations
* Historical storage and trend analysis

### Astronomy Content

The backend also integrates NASA Astronomy Picture of the Day data.

## How AstroCast Works

```text
User enters a city
        |
        v
React frontend
        |
        v
FastAPI backend
        |
        +----> Open-Meteo Geocoding API
        |
        +----> Open-Meteo Forecast API
        |
        +----> NASA APOD API
        |
        +----> NOAA SWPC data pipeline
        |
        v
Normalized data and scoring
        |
        v
Forecasts, risk levels, and explanations
```

## Technology Stack

### Frontend

* React
* TypeScript
* Vite

### Backend

* Python
* FastAPI
* Pydantic
* Requests

### Data Layer

* PostgreSQL
* SQLAlchemy
* Alembic

### External Data Sources

* Open-Meteo Geocoding API
* Open-Meteo Forecast API
* NASA Astronomy Picture of the Day API
* NOAA Space Weather Prediction Center

### Testing and Tooling

* Pytest
* Vitest
* Playwright
* Git and GitHub
* Docker Compose

## Current Status

AstroCast currently supports an end-to-end city-based stargazing forecast using Open-Meteo.

The working flow is:

```text
City search
    |
    v
Geocoding
    |
    v
Weather forecast
    |
    v
Stargazing score
    |
    v
React result cards
```

PostgreSQL persistence, NOAA ingestion, fetch logging, and current space-weather output are being added next.

## Project Structure

```text
astrocast/
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   `-- services/
|       |-- astronomy_service.py
|       |-- scoring_service.py
|       `-- weather_service.py
|-- docs/
|   |-- API_PLAN.md
|   |-- ARCHITECTURE.md
|   |-- api.md
|   |-- backlog.md
|   |-- mvp.md
|   |-- project-brief.md
|   `-- week-1-baseline.md
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- data/
|   |   |-- App.tsx
|   |   `-- main.tsx
|   |-- package.json
|   `-- vite.config.ts
|-- .gitignore
`-- README.md
```

## Local Setup

### Backend

From the project root:

```cmd
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

### Frontend

Open a second terminal:

```cmd
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Environment Variables

Create a local `.env` file for secrets and configuration.

```env
NASA_API_KEY=your_nasa_api_key
```

The backend currently falls back to NASA's `DEMO_KEY` when `NASA_API_KEY` is not provided.

Database configuration will use:

```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/astrocast
```

Do not commit the `.env` file.

## Current API Routes

| Method | Route                | Purpose                                        |
| ------ | -------------------- | ---------------------------------------------- |
| GET    | `/`                  | Confirms the backend is running                |
| GET    | `/health`            | Returns backend health status                  |
| GET    | `/geocode?city=...`  | Converts a city name into location data        |
| GET    | `/forecast?city=...` | Returns the local stargazing forecast          |
| GET    | `/apod`              | Returns NASA Astronomy Picture of the Day data |

Planned space-weather routes:

| Method | Route                        | Purpose                                             |
| ------ | ---------------------------- | --------------------------------------------------- |
| POST   | `/api/admin/ingestion/noaa`  | Runs NOAA ingestion manually                        |
| GET    | `/api/space-weather/current` | Returns current normalized space-weather conditions |

## Roadmap

Major project milestones include:

1. Local stargazing forecast
2. PostgreSQL persistence
3. NOAA ingestion and deduplication
4. Current space-weather risk output
5. Dashboard and charts
6. Astronomy intelligence
7. Testing and reliability
8. Deployment and documentation

Detailed planning and progress tracking are maintained in the `docs` folder.

## Known Limitations

* City searches currently select the first matching geocoding result.
* Cities with the same name are not yet disambiguated.
* The forecast currently evaluates a fixed 10:00 PM hour.
* The frontend does not yet display NASA APOD data.
* Space-weather persistence and ingestion are still under development.

## Project Goal

AstroCast is designed as both a useful astronomy application and a full-stack software engineering project demonstrating:

* API integration
* Backend architecture
* Data normalization
* Relational database design
* Migrations
* Deduplication
* Testing
* Frontend integration
* Scientific-data interpretation
* Deployment
