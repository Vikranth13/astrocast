from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from services.astronomy_service import get_apod
from services.weather_service import geocode_city, get_forecast_for_city


app = FastAPI(title="AstroCast API")

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
        "message": "AstroCast backend is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
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