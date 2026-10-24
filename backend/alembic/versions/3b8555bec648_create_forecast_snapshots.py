"""Create forecast_snapshots

Stores what each local observing forecast showed and when, so that
later checks for the same place can be compared with earlier ones.

Each row belongs to one searched location in the existing locations
table, and is removed with it. The service keeps at most one snapshot
per location, forecast hour, and hour of checking: a repeat search
within the hour refreshes the latest row rather than adding another.
That rule lives in the service, not in a constraint, because "within
the hour" is relative to the moment of the new check.

The index on (location_id, retrieved_at) serves both queries the
history views make: the latest snapshot for each location, and one
location's snapshots newest first.

Revision ID: 3b8555bec648
Revises: 0dc8d08221c3
Create Date: 2026-10-23 23:44:00.533895

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3b8555bec648'
down_revision: Union[str, Sequence[str], None] = '0dc8d08221c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the table and its lookup index."""

    op.create_table(
        'forecast_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column(
            'retrieved_at',
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            'forecast_time',
            sa.String(length=16),
            nullable=False,
        ),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column(
            'rating',
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            'limiting_factor',
            sa.String(length=40),
            nullable=True,
        ),
        sa.Column(
            'best_window_first_hour',
            sa.String(length=16),
            nullable=True,
        ),
        sa.Column(
            'best_window_last_hour',
            sa.String(length=16),
            nullable=True,
        ),
        sa.Column(
            'best_window_qualifies',
            sa.Boolean(),
            nullable=True,
        ),
        sa.Column(
            'response',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['location_id'],
            ['locations.id'],
            name=op.f('fk_forecast_snapshots_location_id_locations'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint(
            'id',
            name=op.f('pk_forecast_snapshots'),
        ),
    )

    op.create_index(
        'ix_forecast_snapshots_location_id_retrieved_at',
        'forecast_snapshots',
        ['location_id', 'retrieved_at'],
        unique=False,
    )


def downgrade() -> None:
    """Drop the index, then the table."""

    op.drop_index(
        'ix_forecast_snapshots_location_id_retrieved_at',
        table_name='forecast_snapshots',
    )

    op.drop_table('forecast_snapshots')
