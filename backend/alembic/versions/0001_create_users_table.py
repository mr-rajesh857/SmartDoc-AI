"""create users table

Revision ID: 0001_create_users_table
Revises: None
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_create_users_table'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('username', sa.String(length=150), nullable=False, unique=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='user'),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
    )


def downgrade():
    op.drop_table('users')
