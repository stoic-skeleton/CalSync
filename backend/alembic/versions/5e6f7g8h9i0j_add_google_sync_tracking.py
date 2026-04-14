"""add last_synced_at and last_synced_event_count to calendar_feeds

Revision ID: 5e6f7g8h9i0j
Revises: 4d5e6f7g8h9i
Create Date: 2026-04-14 00:00:00.000000
"""
from alembic import op

revision = "5e6f7g8h9i0j"
down_revision = "4d5e6f7g8h9i"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE calendar_feeds
        ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_synced_event_count INTEGER
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE calendar_feeds
        DROP COLUMN IF EXISTS last_synced_at,
        DROP COLUMN IF EXISTS last_synced_event_count
    """)
