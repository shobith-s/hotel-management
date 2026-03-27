"""add_payment_mode_to_bookings

Revision ID: a1b2c3d4e5f6
Revises: 189c5d665cd2
Create Date: 2026-03-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '189c5d665cd2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'bookings',
        sa.Column(
            'payment_mode',
            sa.Enum('cash', 'card', 'upi', 'complimentary', 'credit', name='paymentmode'),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column('bookings', 'payment_mode')
