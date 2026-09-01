from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, TimestampMixin


class ApiFetchLog(TimestampMixin, Base):
    """
    An audit record for one external API ingestion attempt.
    """

    __tablename__ = "api_fetch_logs"

    __table_args__ = (
        CheckConstraint(
            (
                "status IN "
                "('started', 'success', 'partial', 'failed')"
            ),
            name="fetch_status",
        ),
        Index(
            "ix_api_fetch_logs_source_started_at",
            "source",
            "started_at",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    source: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    endpoint: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="started",
        server_default=text("'started'"),
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    duration_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    http_status_code: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    fetched_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    normalized_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    inserted_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    skipped_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    failed_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )