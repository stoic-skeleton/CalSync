"""Promote an existing user to admin via direct DB update.

Usage:
  python scripts/promote_admin.py [email]

Defaults: admin@example.com
"""
import sys

from app.db import SessionLocal
from app.models import User


def main(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email.lower()).one_or_none()
        if not user:
            print("User not found — register first")
            return
        user.tier = "admin"
        db.add(user)
        db.commit()
        print(f"Promoted {email} to admin")
    except Exception as exc:
        print("Error promoting user:", exc)
    finally:
        db.close()


if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@example.com"
    main(email)
