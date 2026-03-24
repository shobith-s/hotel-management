"""add_force_password_change_to_users

Revision ID: 189c5d665cd2
Revises: adf7b997bfe4
Create Date: 2026-03-25 00:37:41.127315

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '189c5d665cd2'
down_revision: Union[str, None] = 'adf7b997bfe4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('force_password_change', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('users', 'force_password_change')
