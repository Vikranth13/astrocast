from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, TimestampMixin


class ForecastSnapshot(TimestampMixin, Base):
    """
    One local observing forecast as AstroCast returned it.

    A snapshot records what a search showed and when, so later checks
    for the same place can be compared with it. The columns hold what
    the history views list. response keeps the full forecast exactly as
    it was returned.
    """

    __tablename__ = "forecast_snapshots"

    __table_args__ = (
        Index(
            "ix_forecast_snapshots_location_id_retrieved_at",
            "location_id",
            "retrieved_at",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    location_id: Mapped[int] = mapped_column(
        ForeignKey(
            "locations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # When AstroCast fetched the forecast, in UTC.
    retrieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # The forecast hour in the location's local time, with no offset,
    # exactly as the forecast response gives it.
    forecast_time: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
    )

    score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    rating: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    limiting_factor: Mapped[str | None] = mapped_column(
        String(40),
        nullable=True,
    )

    best_window_first_hour: Mapped[str | None] = mapped_column(
        String(16),
        nullable=True,
    )

    best_window_last_hour: Mapped[str | None] = mapped_column(
        String(16),
        nullable=True,
    )

    best_window_qualifies: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
    )

    response: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )
