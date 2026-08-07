from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, TimestampMixin


class SpaceWeatherAlert(TimestampMixin, Base):
    """
    A normalized alert or warning from a space-weather source.
    """

    __tablename__ = "space_weather_alerts"

    __table_args__ = (
        UniqueConstraint(
            "source",
            "deduplication_key",
            name=(
                "uq_space_weather_alerts_"
                "source_dedup_key"
            ),
        ),
        Index(
            "ix_space_weather_alerts_issued_at",
            "issued_at",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    source: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    external_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    deduplication_key: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    alert_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    severity: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    raw_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )