from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.orm import Session

from database import get_db
from schemas.errors import ErrorResponse
from schemas.ingestion import IngestionResult
from services.noaa_ingestion_service import (
    ingest_noaa_planetary_k_index,
    ingest_noaa_alerts,
    ingest_noaa_solar_wind,
)


router = APIRouter(
    prefix="/api/admin/ingestion",
    tags=["admin-ingestion"],
)


# Ingestion failures are translated into HTTP
# responses by the global exception handlers in
# api/errors.py. These routes deliberately do not
# catch them, so every ingestion endpoint reports
# failures identically.
INGESTION_ERROR_RESPONSES = {
    502: {
        "model": ErrorResponse,
        "description": (
            "NOAA could not be reached."
        ),
    },
    500: {
        "model": ErrorResponse,
        "description": (
            "The run failed while storing results."
        ),
    },
}


@router.post(
    "/noaa",
    response_model=IngestionResult,
    responses=INGESTION_ERROR_RESPONSES,
    summary="Run NOAA Planetary K-index ingestion",
)
def run_noaa_ingestion(
    db: Session = Depends(get_db),
):
    """
    Run NOAA Planetary K-index ingestion manually.

    This development administration endpoint is not
    yet authenticated.
    """

    return ingest_noaa_planetary_k_index(
        db
    )


@router.post(
    "/noaa/alerts",
    response_model=IngestionResult,
    responses=INGESTION_ERROR_RESPONSES,
    summary="Run NOAA alert ingestion",
)
def run_noaa_alert_ingestion(
    db: Session = Depends(get_db),
):
    """
    Run NOAA SWPC alert ingestion manually.

    This development administration endpoint is not
    yet authenticated.
    """

    return ingest_noaa_alerts(
        db
    )


@router.post(
    "/noaa/solar-wind",
    response_model=IngestionResult,
    responses=INGESTION_ERROR_RESPONSES,
    summary="Run NOAA solar-wind ingestion",
)
def run_noaa_solar_wind_ingestion(
    db: Session = Depends(get_db),
):
    """
    Run NOAA real-time solar-wind ingestion manually.

    This development administration endpoint is not
    yet authenticated.
    """

    return ingest_noaa_solar_wind(
        db
    )
