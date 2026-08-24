from fastapi import APIRouter

from database import database_is_available


router = APIRouter(
    tags=["system"],
)


@router.get("/")
def home():
    return {
        "message": "AstroCast backend is running",
    }


@router.get("/health")
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