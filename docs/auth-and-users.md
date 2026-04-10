# CalSync — Authentication & User System

## Overview

CalSync uses **email/password authentication** with optional **Google OAuth**, backed by JWT tokens stored in httpOnly cookies. Users are assigned one of three tiers that control feature access.

---

## User Tiers

| Tier | Feeds | Leagues per feed | Refresh rate |
|---|---|---|---|
| `freemium` | Up to 3 | Up to 3 | Every 6 hours |
| `pro` | Unlimited | Unlimited | Every hour |
| `admin` | Unlimited | Unlimited | Every hour + admin UI |

Tier is enforced on **both** the server (FastAPI) and the client (browse page selection bar).

---

## Backend

### Models (`app/models.py`)

**`User`** table:

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `email` | String(200) | Unique, lowercase |
| `name` | String(150) | Optional |
| `picture_url` | Text | Google profile photo |
| `google_id` | String(200) | Unique, set on Google OAuth |
| `hashed_password` | String(200) | bcrypt hash; null for Google-only accounts |
| `tier` | String(20) | `freemium` / `pro` / `admin` |
| `is_active` | Boolean | False = soft-deleted |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

**`CalendarFeed`** now has an optional `user_id` FK → `users.id` (`ON DELETE SET NULL`).

---

### Auth Service (`app/services/auth.py`)

| Function | Purpose |
|---|---|
| `hash_password(password)` | bcrypt hash via passlib |
| `verify_password(plain, hashed)` | bcrypt verify |
| `create_access_token(data)` | Signs a JWT with `SECRET_KEY`, expires in `JWT_EXPIRE_MINUTES` |
| `decode_access_token(token)` | Verifies and decodes JWT; raises 401 on failure |
| `get_google_auth_url()` | Builds Google OAuth redirect URL |
| `exchange_google_code(code)` | Exchanges code for tokens + userinfo via Google APIs |

**Dependencies:**
- `python-jose[cryptography]` — JWT signing/verification
- `passlib[bcrypt]` — password hashing
- `bcrypt<4.0.0` — pinned for passlib compatibility

**Required environment variable:** `SECRET_KEY` — must be a long random string (e.g. `python -c "import secrets; print(secrets.token_hex(32))"`).

---

### Auth Router (`app/routers/auth.py`) — prefix `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | None | Create new freemium account |
| POST | `/login` | None | Email/password login; sets session cookie |
| POST | `/logout` | None | Clears session cookie |
| GET | `/me` | Cookie | Returns current user |
| GET | `/google` | None | Redirects to Google OAuth consent screen |
| GET | `/google/callback` | None | Handles OAuth callback; upserts user; sets cookie |

**Session cookie:**

| Property | Dev | Production |
|---|---|---|
| Name | `calsync_session` (configurable via `SESSION_COOKIE_NAME`) | same |
| `httpOnly` | true | true |
| `secure` | false | true |
| `samesite` | `lax` | `none` (required for cross-origin Vercel → Railway) |
| Expiry | 7 days (`JWT_EXPIRE_MINUTES=10080`) | same |

> **Why `samesite=none` in production?** The frontend (Vercel) and backend (Railway) are on different domains. Cross-origin cookies require `samesite=none; secure`.

---

### FastAPI Dependencies (`app/dependencies.py`)

| Dependency | Behaviour |
|---|---|
| `get_current_user` | Reads cookie → decodes JWT → returns `User`; raises 401 if missing/invalid |
| `require_admin` | Calls `get_current_user`; raises 403 if `tier != "admin"` |
| `require_tier(min_tier)` | Raises 403 if user's tier is below the minimum |

---

### Admin Router (`app/routers/admin.py`) — all routes require `require_admin`

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/stats` | Counts of users by tier, feeds, and events |
| GET | `/api/admin/users?page=1&page_size=50` | Paginated user list |
| PATCH | `/api/admin/users/{id}` | Update `tier` and/or `is_active` |
| DELETE | `/api/admin/users/{id}` | Soft-deactivates user (`is_active=False`) |

---

### Freemium Enforcement (`app/routers/feeds.py`)

On `POST /api/feeds`:
- Authentication is required (anonymous feed creation is blocked).
- Freemium users are limited to **3 leagues per feed** and **3 total feeds**.
- Exceeding limits returns HTTP 403 with an upgrade message.

---

### Database Migration

Migration file: `alembic/versions/2b3c4d5e6f7g_add_users.py`

- Creates `users` table with all columns and indexes.
- Adds `user_id` column to `calendar_feeds` with FK and `ON DELETE SET NULL`.

Run locally:
```bash
alembic upgrade head
```

---

### Admin Seed (`app/seed.py`)

On backend startup, if `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars are set, the seed function will:
- Create the user if it doesn't exist.
- Promote to `admin` tier if it already exists with a lower tier.

**Environment variables:**
```
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme123
```

**Manual scripts** (run inside the backend container or venv):

```bash
# Create or promote admin
python scripts/create_admin.py admin@example.com mypassword

# Promote existing user to admin
python scripts/promote_admin.py user@example.com

# Register a user via the API
python scripts/register_user.py user@example.com password123 "Display Name"
```

---

## Frontend

### AuthProvider (`src/components/auth-provider.tsx`)

Wraps the entire app (in `layout.tsx`). Exposes via `useAuth()`:

| Property/Method | Type | Description |
|---|---|---|
| `user` | `User \| null` | Currently authenticated user |
| `loading` | `boolean` | True while `/api/auth/me` is in flight on mount |
| `refresh()` | `() => Promise<void>` | Re-fetches `/me` and updates context |
| `login(email, password)` | `Promise<User>` | Calls login API then `refresh()` |
| `logout()` | `Promise<void>` | Calls logout API and clears user state |

---

### Pages

| Route | File | Notes |
|---|---|---|
| `/login` | `src/app/login/page.tsx` | Email/password form + Google OAuth button; `?next=` redirect param |
| `/register` | `src/app/register/page.tsx` | Registration form; auto-logs in after success |
| `/profile` | `src/app/profile/page.tsx` | Shows tier, email, join date; sign out button |
| `/admin` | `src/app/admin/page.tsx` | Admin-only dashboard (redirects non-admins to `/`) |

Both `/login` and `/register` use `export const dynamic = "force-dynamic"` to prevent static prerendering (required because `useSearchParams()` is used for the `?next=` redirect param).

---

### Admin Dashboard (`src/app/admin/page.tsx`)

Features:
- **Stats cards** — totals for users (by tier), feeds, and events.
- **Paginated users table** — shows email, name, tier selector, status, join date, and action button.
- **Tier change** — requires confirmation modal before applying.
- **Activate/Deactivate** — requires confirmation modal; own account row shows "You" badge and is protected from self-deactivation.
- **Toast notifications** — success/error feedback after each action, auto-dismissed after 3 seconds.

---

### UI Components

| Component | File | Purpose |
|---|---|---|
| `AuthProvider` | `auth-provider.tsx` | Auth context; wraps app in layout |
| `ConfirmModal` | `confirm-modal.tsx` | Reusable confirmation dialog for destructive actions |
| `Toast` | `toast.tsx` | Bottom-right toast notification |
| `FreemiumUpgradeBanner` | `freemium-upgrade-banner.tsx` | Top banner shown to freemium users; dismissible |
| `PricingCta` | `pricing-cta.tsx` | Auth-aware CTA button on pricing page |

---

### Freemium Enforcement (Client-side)

In `src/app/browse/page.tsx`:
- Free/unauthenticated users cannot select more than 3 leagues — the selection is blocked with an inline error banner.
- `SelectionBar` shows a league counter (`2/3 leagues`) and disables "Get Calendar →" if over limit.

In `src/app/get-calendar/page.tsx`:
- If the user is not signed in, the generate button is replaced with a "Sign in to continue" prompt.
- API 401 responses redirect to `/login?next=/get-calendar`.

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | **Yes** | JWT signing key — generate with `secrets.token_hex(32)` |
| `DATABASE_URL` | Yes | PostgreSQL connection string (auto-set by Railway Postgres plugin) |
| `REDIS_URL` | Yes | Redis connection string (auto-set by Railway Redis plugin) |
| `ENVIRONMENT` | Yes | Set to `production` — enables `secure` + `samesite=none` cookies |
| `CORS_ORIGINS` | Yes | Your Vercel frontend URL, e.g. `https://calsync.vercel.app` |
| `API_BASE_URL` | Yes | Your Railway backend URL, e.g. `https://calsync.up.railway.app` |
| `ADMIN_EMAIL` | Recommended | Seeds admin user on startup |
| `ADMIN_PASSWORD` | Recommended | Seeds admin user on startup |
| `CRICAPI_KEY` | Yes (for IPL) | API key from cricapi.com |
| `GOOGLE_CLIENT_ID` | Optional | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional | For Google OAuth |
| `JWT_EXPIRE_MINUTES` | No | Default: `10080` (7 days) |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | Your Railway backend URL — must be set or browser hits `localhost:8000` |
