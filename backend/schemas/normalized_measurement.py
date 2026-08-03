from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel


class NormalizedSpaceWeatherMeasurement(BaseModel):
    """
    AstroCast's source-independent representation
    of one space-weather measurement.
    """

    source: str

    deduplication_key: str

    metric_name: str

    observed_at: datetime

    numeric_value: Decimal

    text_value: str | None = None

    unit: str | None = None

    station: str | None = None

    raw_payload: dict[str, Any]