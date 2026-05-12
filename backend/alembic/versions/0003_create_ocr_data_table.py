"""create ocr_data table

Revision ID: 0003_create_ocr_data_table
Revises: 0002_migrate_roles_to_user_role
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0003_create_ocr_data_table'
down_revision = '0002_migrate_roles_to_user_role'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ocr_data',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('original_filename', sa.String(length=1024), nullable=False),
        sa.Column('document_uuid', sa.String(length=64), nullable=False, index=True),
        sa.Column('num_pages', sa.Integer(), nullable=False),
        sa.Column('ocr_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('ocr_data')
