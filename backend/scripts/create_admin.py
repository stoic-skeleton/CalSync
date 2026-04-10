"""Create or promote an admin user.

Usage:
  python scripts/create_admin.py [email] [password]

Defaults: email=admin@example.com, password=changeme
"""
import sys

from app.db import SessionLocal
from app.models import User
from app.services.auth import hash_password


def main():
    email = sys.argv[1].lower() if len(sys.argv) > 1 else "admin@example.com"
    password = sys.argv[2] if len(sys.argv) > 2 else "changeme"

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).one_or_none()
        if not user:
            user = User(email=email, name="Admin", hashed_password=hash_password(password), tier="admin")
            db.add(user)
            db.commit()
            print(f"Created admin user: {email}")
        else:
            user.tier = "admin"
            if not user.hashed_password:
                user.hashed_password = hash_password(password)
            db.add(user)
            db.commit()
            print(f"Promoted existing user to admin: {email}")
    except Exception as exc:
        print("Error creating/promoting admin:", exc)
    finally:
        db.close()


if __name__ == "__main__":
    main()
