"""add google_access_token and google_refresh_token to users

Revision ID: 3c4d5e6f7g8h
Revises: 2b3c4d5e6f7g
Create Date: 2026-04-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "3c4d5e6f7g8h"
down_revision = "2b3c4d5e6f7g"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS google_access_token TEXT,
        ADD COLUMN IF NOT EXISTS google_refresh_token TEXT
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS google_access_token")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS google_refresh_token")
