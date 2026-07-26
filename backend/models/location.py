from decimal import Decimal

from sqlalchemy import Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, TimestampMixin


class Location(TimestampMixin, Base):
    """
    A normalized geographic location returned by geocoding.
    """

    __tablename__ = "locations"

    __table_args__ = (
        UniqueConstraint(
            "latitude",
            "longitude",
            name="uq_locations_coordinates",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    region: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    country: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    latitude: Mapped[Decimal] = mapped_column(
        Numeric(9, 6),
        nullable=False,
    )

    longitude: Mapped[Decimal] = mapped_column(
        Numeric(9, 6),
        nullable=False,
    )

    timezone: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )