from datetime import datetime
from typing import Any

from pydantic import BaseModel


class NormalizedAlert(BaseModel):
    """
    Source-independent normalized space-weather
    alert ready for persistence.
    """

    source: str

    external_id: str

    deduplication_key: str

    alert_type: str

    severity: str | None

    issued_at: datetime

    expires_at: datetime | None

    summary: str

    raw_payload: dict[str, Any]