from fastapi import APIRouter

from services.astronomy_service import get_apod


router = APIRouter(
    tags=["astronomy"],
)


@router.get("/apod")
def apod():
    return get_apod()