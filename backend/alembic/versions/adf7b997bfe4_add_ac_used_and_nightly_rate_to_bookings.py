"""add ac_used and nightly_rate to bookings

Revision ID: adf7b997bfe4
Revises: b6c13b4ef941
Create Date: 2026-03-22 15:37:05.013798

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'adf7b997bfe4'
down_revision: Union[str, None] = 'b6c13b4ef941'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('bookings', sa.Column('ac_used', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('bookings', sa.Column('nightly_rate', sa.Numeric(10, 2), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('bookings', 'nightly_rate')
    op.drop_column('bookings', 'ac_used')
