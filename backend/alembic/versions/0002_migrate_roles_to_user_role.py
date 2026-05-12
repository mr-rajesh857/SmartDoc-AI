"""migrate roles into users.role

Revision ID: 0002_migrate_roles_to_user_role
Revises: 0001_create_users_table
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002_migrate_roles_to_user_role'
down_revision = '0001_create_users_table'
branch_labels = None
depends_on = None


def upgrade():
    # Add username and role columns if they don't exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c['name'] for c in inspector.get_columns('users')]

    if 'username' not in cols:
        op.add_column('users', sa.Column('username', sa.String(length=150), nullable=True))

    if 'role' not in cols:
        op.add_column('users', sa.Column('role', sa.String(length=50), nullable=True, server_default='user'))

    # If old role tables exist, copy role data into users.role
    # This will pick one role per user if multiple (the first found).
    op.execute("""
    UPDATE users
    SET role = (
        SELECT r.name FROM roles r
        JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = users.id
        LIMIT 1
    )
    WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = users.id)
    """)

    # Fill username from email local-part for any missing usernames
    op.execute("""
    UPDATE users
    SET username = SUBSTRING_INDEX(email, '@', 1)
    WHERE username IS NULL OR username = ''
    """)

    # Make username non-nullable and unique
    op.alter_column('users', 'username', nullable=False)
    try:
        op.create_unique_constraint('uq_users_username', 'users', ['username'])
    except Exception:
        # ignore if constraint already exists
        pass

    # Make role non-nullable with default
    op.alter_column('users', 'role', nullable=False, server_default='user')

    # Drop old join and roles tables if they exist
    op.execute('DROP TABLE IF EXISTS user_roles')
    op.execute('DROP TABLE IF EXISTS roles')


def downgrade():
    # recreate simple roles and user_roles tables (without restoring previous associations)
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=50), nullable=False, unique=True),
    )

    op.create_table(
        'user_roles',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
    )

    # remove unique constraint on username if exists
    try:
        op.drop_constraint('uq_users_username', 'users', type_='unique')
    except Exception:
        pass

    # allow username nullable again
    op.alter_column('users', 'username', nullable=True)

    # allow role nullable
    op.alter_column('users', 'role', nullable=True)
