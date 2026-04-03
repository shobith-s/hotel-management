"""add bill_splits table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-02
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'bill_splits',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bill_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('split_number', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('is_paid', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('payment_mode', postgresql.ENUM('cash', 'card', 'upi', 'complimentary', 'credit', name='paymentmode', create_type=False), nullable=True),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['bill_id'], ['bills.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_bill_splits_bill_id', 'bill_splits', ['bill_id'])


def downgrade() -> None:
    op.drop_index('ix_bill_splits_bill_id', table_name='bill_splits')
    op.drop_table('bill_splits')
