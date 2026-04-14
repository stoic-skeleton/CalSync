"""add google_calendar_id to calendar_feeds

Revision ID: 4d5e6f7g8h9i
Revises: 3c4d5e6f7g8h
Create Date: 2026-04-14 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "4d5e6f7g8h9i"
down_revision = "3c4d5e6f7g8h"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE calendar_feeds
        ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(200)
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE calendar_feeds DROP COLUMN IF EXISTS google_calendar_id")
