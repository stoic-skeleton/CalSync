"""Seed initial league and team data into the database."""
import os

from app.db import SessionLocal, engine, Base
from app.models import League, Team, User  # noqa: F401 — registers models


def _seed_admin(db) -> None:
    """Create or promote the admin user defined by ADMIN_EMAIL / ADMIN_PASSWORD env vars."""
    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "").strip()
    if not email or not password:
        return

    # Import here to avoid circular imports at module load time
    from app.services.auth import hash_password

    from sqlalchemy import select
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        if existing.tier != "admin":
            existing.tier = "admin"
            db.add(existing)
            db.commit()
            print(f"  Promoted {email} to admin")
        else:
            print(f"  Admin already exists: {email}")
    else:
        user = User(
            email=email,
            name="Admin",
            hashed_password=hash_password(password),
            tier="admin",
        )
        db.add(user)
        db.commit()
        print(f"  Created admin user: {email}")


def seed():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        leagues_data = [
            {
                "name": "Formula 1",
                "slug": "formula-1",
                "sport_type": "motorsport",
                "country": "International",
                "data_source": "jolpica",
            },
            {
                "name": "IPL",
                "slug": "ipl",
                "sport_type": "cricket",
                "country": "India",
                "data_source": "thesportsdb",
            },
            {
                "name": "NFL",
                "slug": "nfl",
                "sport_type": "american_football",
                "country": "USA",
                "data_source": "espn",
            },
            {
                "name": "NBA",
                "slug": "nba",
                "sport_type": "basketball",
                "country": "USA",
                "data_source": "espn",
            },
            {
                "name": "MLS",
                "slug": "mls",
                "sport_type": "soccer",
                "country": "USA/Canada",
                "data_source": "espn",
            },
        ]

        for data in leagues_data:
            from sqlalchemy import select
            existing = db.scalar(select(League).where(League.slug == data["slug"]))
            if not existing:
                db.add(League(**data))
                print(f"  Added league: {data['name']}")
            else:
                print(f"  League already exists: {data['name']}")

        db.commit()
        print("Seed complete.")

        _seed_admin(db)
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding database…")
    seed()
