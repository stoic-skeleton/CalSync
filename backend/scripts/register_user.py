"""Register a user via the running FastAPI register endpoint.

Usage:
  python scripts/register_user.py [email] [password] [name]

Defaults: admin@example.com changeme Admin
"""
import sys
import httpx

email = sys.argv[1] if len(sys.argv) > 1 else "admin@example.com"
password = sys.argv[2] if len(sys.argv) > 2 else "changeme"
name = sys.argv[3] if len(sys.argv) > 3 else "Admin"

url = "http://127.0.0.1:8000/api/auth/register"
payload = {"email": email, "password": password, "name": name}

try:
    r = httpx.post(url, json=payload, timeout=10.0)
    print(r.status_code)
    print(r.text)
except Exception as exc:
    print("Request error:", exc)
