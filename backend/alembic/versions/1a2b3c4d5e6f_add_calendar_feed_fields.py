"""add calendar_feed fields

Revision ID: 1a2b3c4d5e6f
Revises: 
Create Date: 2026-04-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1a2b3c4d5e6f'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns if they don't already exist (idempotent)
    op.execute("""
    ALTER TABLE calendar_feeds ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0 NOT NULL;
    ALTER TABLE calendar_feeds ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER;
    ALTER TABLE calendar_feeds ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;
    ALTER TABLE calendar_feeds ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    """)


def downgrade() -> None:
    op.drop_column('calendar_feeds', 'created_at')
    op.drop_column('calendar_feeds', 'last_accessed_at')
    op.drop_column('calendar_feeds', 'reminder_minutes')
    op.drop_column('calendar_feeds', 'access_count')
