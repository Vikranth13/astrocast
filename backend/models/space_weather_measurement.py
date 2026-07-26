from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, TimestampMixin


class SpaceWeatherMeasurement(TimestampMixin, Base):
    """
    A normalized numeric or textual space-weather measurement.
    """

    __tablename__ = "space_weather_measurements"

    __table_args__ = (
        UniqueConstraint(
            "source",
            "deduplication_key",
            name=(
                "uq_space_weather_measurements_"
                "source_dedup_key"
            ),
        ),
        CheckConstraint(
            (
                "numeric_value IS NOT NULL "
                "OR text_value IS NOT NULL"
            ),
            name="has_measurement_value",
        ),
        Index(
            (
                "ix_space_weather_measurements_"
                "metric_observed_at"
            ),
            "metric_name",
            "observed_at",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    source: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    deduplication_key: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    metric_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    numeric_value: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 6),
        nullable=True,
    )

    text_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    unit: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    station: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    raw_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )