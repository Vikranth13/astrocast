from datetime import datetime, timezone
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class NoaaPlanetaryKIndexSourceRecord(BaseModel):
    """
    Validated representation of one NOAA source record.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
    )

    time_tag: datetime

    kp: Decimal = Field(
        alias="Kp",
        ge=0,
        le=9,
    )

    a_running: int = Field(
        ge=0,
    )

    station_count: int = Field(
        ge=0,
    )

    @field_validator("time_tag")
    @classmethod
    def normalize_time_tag(
        cls,
        value: datetime,
    ) -> datetime:
        """
        Interpret source timestamps without offsets
        as UTC and normalize aware timestamps to UTC.
        """

        if value.tzinfo is None:
            return value.replace(
                tzinfo=timezone.utc,
            )

        return value.astimezone(
            timezone.utc,
        )