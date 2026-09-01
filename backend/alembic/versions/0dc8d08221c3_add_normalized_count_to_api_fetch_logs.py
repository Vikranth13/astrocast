"""Add normalized_count to api_fetch_logs

Records how many logical records an ingestion run produced after
validation, filtering, and supersede resolution, as distinct from
how many raw records NOAA returned.

This gives every ingestion source one reconciliation value:

    normalized_count = inserted_count + skipped_count

fetched_count keeps its original meaning of raw source records, so the
difference between the two shows what normalization did. It is signed:
alerts collapse (75 source rows to 73 logical alerts, the rest
superseded), while solar wind expands (one reading yields separate
speed, density, and temperature measurements). Neither difference is a
duplicate, which is why it must not be reported as skipped.

Backfill caveat
---------------
Existing successful rows are backfilled with inserted_count +
skipped_count. That is exact for historical planetary K-index and
solar-wind runs, whose skipped_count was already derived from the
normalized records.

It is approximate for historical alert runs. Those computed
skipped_count as fetched_count - inserted_count, which forced the
totals to reconcile and quietly counted superseded notifications as
skipped duplicates. Backfilled alert rows therefore inherit that
overstatement and can read slightly high. This is preferred to
leaving the column at zero, but historical alert rows should not be
treated as precise. Runs recorded after this migration are correct.

Revision ID: 0dc8d08221c3
Revises: e2461684f17c
Create Date: 2026-08-31 22:58:49.294991

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0dc8d08221c3'
down_revision: Union[str, Sequence[str], None] = 'e2461684f17c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the column, then backfill historical rows."""

    op.add_column(
        'api_fetch_logs',
        sa.Column(
            'normalized_count',
            sa.Integer(),
            server_default=sa.text('0'),
            nullable=False,
        ),
    )

    op.execute(
        """
        UPDATE api_fetch_logs
        SET normalized_count = inserted_count + skipped_count
        WHERE status = 'success'
        """
    )


def downgrade() -> None:
    """Drop the column. Backfilled values are not recoverable."""

    op.drop_column(
        'api_fetch_logs',
        'normalized_count',
    )
