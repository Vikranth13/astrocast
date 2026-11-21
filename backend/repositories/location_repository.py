from decimal import Decimal

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import (
    insert as postgresql_insert,
)
from sqlalchemy.orm import Session

from models.location import Location


LOCATION_COORDINATES_CONSTRAINT = (
    "uq_locations_coordinates"
)

# The latitude and longitude columns hold six decimal places.
COORDINATE_DECIMALS = 6


def to_coordinate(
    value: float,
) -> Decimal:
    """
    Round a coordinate to the stored precision.

    Rounding before the insert, rather than letting the column round,
    means the uniqueness check compares the same values that will be
    stored.
    """

    return Decimal(
        str(
            round(
                value,
                COORDINATE_DECIMALS,
            )
        )
    )


def upsert_location(
    db: Session,
    name: str,
    region: str | None,
    country: str | None,
    latitude: float,
    longitude: float,
    timezone: str | None,
) -> int:
    """
    Store a searched place once, keyed on its coordinates, and return
    its id.

    A repeat search refreshes the descriptive fields, so a name that
    the geocoder has since corrected is not kept stale.
    """

    statement = (
        postgresql_insert(
            Location
        )
        .values(
            name=name,
            region=region,
            country=country,
            latitude=to_coordinate(latitude),
            longitude=to_coordinate(longitude),
            timezone=timezone,
        )
        .on_conflict_do_update(
            constraint=LOCATION_COORDINATES_CONSTRAINT,
            set_={
                "name": name,
                "region": region,
                "country": country,
                "timezone": timezone,
            },
        )
        .returning(
            Location.id
        )
    )

    return db.execute(
        statement
    ).scalar_one()


def get_location_by_id(
    db: Session,
    location_id: int,
) -> Location | None:
    return db.get(
        Location,
        location_id,
    )


def delete_all_locations(
    db: Session,
) -> int:
    """
    Delete every searched place and return how many there were.

    Each place's forecast snapshots go with it, through the foreign
    key's ON DELETE CASCADE.
    """

    result = db.execute(
        delete(
            Location
        )
    )

    return result.rowcount
