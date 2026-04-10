"""add users table and feed owner

Revision ID: 2b3c4d5e6f7g
Revises: 1a2b3c4d5e6f
Create Date: 2026-04-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2b3c4d5e6f7g'
down_revision = '1a2b3c4d5e6f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(length=200), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=True),
        sa.Column('picture_url', sa.Text(), nullable=True),
        sa.Column('google_id', sa.String(length=200), nullable=True),
        sa.Column('hashed_password', sa.String(length=200), nullable=True),
        sa.Column('tier', sa.String(length=20), nullable=False, server_default='freemium'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=False)

    # Add user_id column to calendar_feeds
    op.add_column('calendar_feeds', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_calendar_feeds_user_id_users', 'calendar_feeds', 'users', ['user_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_calendar_feeds_user_id_users', 'calendar_feeds', type_='foreignkey')
    op.drop_column('calendar_feeds', 'user_id')
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
