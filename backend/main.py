from contextlib import asynccontextmanager

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Query,
)

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import settings
from database import (
    database_is_available,
    get_db,
)
from services.astronomy_service import get_apod
from services.weather_service import geocode_city, get_forecast_for_city

from schemas.ingestion import IngestionResult
from services.noaa_ingestion_service import (
    NoaaIngestionDatabaseError,
    NoaaIngestionError,
    NoaaIngestionExternalError,
    ingest_noaa_planetary_k_index,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Check database connectivity when the application starts.

    The application is still allowed to start when PostgreSQL is unavailable
    so the existing external-API forecast routes remain usable.
    """

    if database_is_available():
        print("Database connection verified.")
    else:
        print("Warning: Database connection could not be verified.")

    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "AstroCast backend is running",
    }


@app.get("/health")
def health_check():
    database_status = (
        "ok"
        if database_is_available()
        else "unavailable"
    )

    return {
        "status": "ok",
        "database": database_status,
    }


@app.get("/geocode")
def geocode(city: str = Query(..., min_length=2)):
    return geocode_city(city)


@app.get("/forecast")
def forecast(city: str = Query(..., min_length=2)):
    return get_forecast_for_city(city)


@app.get("/apod")
def apod():
    return get_apod()

@app.post(
    "/api/admin/ingestion/noaa",
    response_model=IngestionResult,
)
def run_noaa_ingestion(
    db: Session = Depends(get_db),
):
    """
    Run NOAA Planetary K-index ingestion manually.

    This is a development-only administration route.
    """

    try:
        return ingest_noaa_planetary_k_index(
            db
        )

    except NoaaIngestionExternalError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error

    except NoaaIngestionDatabaseError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

    except NoaaIngestionError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error