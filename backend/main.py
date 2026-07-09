from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from services.weather_service import get_mock_forecast
from services.astronomy_service import get_mock_apod


app = FastAPI(title="AstroCast API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.get("/forecast")
def get_forecast(city: str = Query(..., min_length=2)):
    return get_mock_forecast(city)


@app.get("/apod")
def get_apod():
    return get_mock_apod()