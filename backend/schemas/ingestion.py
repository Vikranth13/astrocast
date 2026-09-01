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
    """Raw records returned by the source."""

    normalized: int
    """
    Logical records produced after validation,
    filtering, and supersede resolution.

    This is the value that reconciles:
    normalized == inserted + skipped.

    It may be lower than fetched, when source rows
    are superseded or filtered, or higher, when one
    reading yields several measurements.
    """

    inserted: int

    skipped: int

    failed: int