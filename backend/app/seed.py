"""Seed initial league and team data into the database."""
from app.db import SessionLocal, engine, Base
from app.models import League, Team  # noqa: F401 — registers models


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
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding database…")
    seed()
