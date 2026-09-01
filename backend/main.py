from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.errors import (
    register_exception_handlers,
)
from api.routes.admin_ingestion import (
    router as admin_ingestion_router,
)
from api.routes.astronomy import (
    router as astronomy_router,
)
from api.routes.observe import (
    router as observe_router,
)
from api.routes.space_weather import (
    router as space_weather_router,
)
from api.routes.system import (
    router as system_router,
)
from config import settings
from database import database_is_available

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

register_exception_handlers(app)

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

app.include_router(
    system_router
)

app.include_router(
    observe_router
)

app.include_router(
    astronomy_router
)

app.include_router(
    space_weather_router
)

app.include_router(
    admin_ingestion_router
)



# @app.get("/")
# def home():
#     return {
#         "message": "AstroCast backend is running",
#     }


# @app.get("/health")
# def health_check():
#     database_status = (
#         "ok"
#         if database_is_available()
#         else "unavailable"
#     )

#     return {
#         "status": "ok",
#         "database": database_status,
#     }


# @app.get("/geocode")
# def geocode(city: str = Query(..., min_length=2)):
#     return geocode_city(city)


# @app.get("/forecast")
# def forecast(city: str = Query(..., min_length=2)):
#     return get_forecast_for_city(city)


# @app.get("/apod")
# def apod():
#     return get_apod()

# @app.post(
#     "/api/admin/ingestion/noaa",
#     response_model=IngestionResult,
# )
# def run_noaa_ingestion(
#     db: Session = Depends(get_db),
# ):
#     """
#     Run NOAA Planetary K-index ingestion manually.

#     This is a development-only administration route.
#     """

#     try:
#         return ingest_noaa_planetary_k_index(
#             db
#         )

#     except NoaaIngestionExternalError as error:
#         raise HTTPException(
#             status_code=502,
#             detail=str(error),
#         ) from error

#     except NoaaIngestionDatabaseError as error:
#         raise HTTPException(
#             status_code=500,
#             detail=str(error),
#         ) from error

#     except NoaaIngestionError as error:
#         raise HTTPException(
#             status_code=500,
#             detail=str(error),
#         ) from error

# @app.get(
#     "/api/space-weather/current",
#     response_model=CurrentSpaceWeatherResponse,
# )
# def current_space_weather(
#     db: Session = Depends(get_db),
# ):
#     """
#     Return the newest stored NOAA Kp observation.
#     """

#     return get_current_space_weather(
#         db
#     )