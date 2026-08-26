from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from sqlalchemy.orm import Session

from database import get_db
from schemas.ingestion import IngestionResult
from services.noaa_ingestion_service import (
    NoaaIngestionDatabaseError,
    NoaaIngestionError,
    NoaaIngestionExternalError,
    ingest_noaa_planetary_k_index,
    ingest_noaa_alerts,
    ingest_noaa_solar_wind,
)


router = APIRouter(
    prefix="/api/admin/ingestion",
    tags=["admin-ingestion"],
)


@router.post(
    "/noaa",
    response_model=IngestionResult,
    summary="Run NOAA ingestion",
)
def run_noaa_ingestion(
    db: Session = Depends(get_db),
):
    """
    Run NOAA Planetary K-index ingestion
    manually.

    This development administration endpoint
    is not yet authenticated.
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

@router.post(
    "/noaa/alerts",
    response_model=IngestionResult,
    summary="Run NOAA alert ingestion",
)
def run_noaa_alert_ingestion(
    db: Session = Depends(get_db),
):
    """
    Run NOAA SWPC alert ingestion manually.

    This development administration endpoint
    is not yet authenticated.
    """

    try:
        return ingest_noaa_alerts(
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

@router.post(
    "/noaa/solar-wind",
    response_model=IngestionResult,
    summary="Run NOAA solar-wind ingestion",
)
def run_noaa_solar_wind_ingestion(
    db: Session = Depends(get_db),
):
    try:
        return ingest_noaa_solar_wind(
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