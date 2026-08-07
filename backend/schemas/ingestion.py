from typing import Literal

from pydantic import BaseModel


class IngestionResult(BaseModel):
    """
    Summary returned after a successful ingestion run.
    """

    source: str

    status: Literal["success"]

    fetch_log_id: int

    fetched: int

    inserted: int

    skipped: int

    failed: int