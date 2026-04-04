# CalSync — Deployment Guide (Railway + Vercel)

## Architecture

| Service    | Host     | What runs there                          |
|------------|----------|------------------------------------------|
| Frontend   | Vercel   | Next.js App Router                       |
| Backend    | Railway  | FastAPI + APScheduler                    |
| PostgreSQL | Railway  | Managed Postgres plugin                  |
| Redis      | Railway  | Managed Redis plugin (optional)          |

Vercel deploys the frontend natively (no Docker). Railway deploys the backend using `backend/Dockerfile`.

---

## Important: Why Vercel for Frontend, Not Railway

Vercel is Next.js's native host — zero config, instant CDN, automatic preview deployments on every PR. Railway is better for always-on processes like the FastAPI backend which runs APScheduler.

**Do not use `output: 'standalone'`** in `next.config.ts` when deploying to Vercel. Vercel has its own optimised build pipeline and standalone mode conflicts with it. The option was removed from `next.config.ts` — the Dockerfile's `runner` stage now uses `npm start` instead if ever needed for a Docker-based deployment.

---

## Part 1: Deploy the Backend on Railway

### Step 1 — Create a Railway project
1. Go to [railway.app](https://railway.app) → sign in with GitHub
2. **New Project** → **Deploy from GitHub repo** → select `CalSync`
3. When asked for root directory, set it to **`backend`**
4. Railway detects the `Dockerfile` automatically

### Step 2 — Add PostgreSQL
1. In the project dashboard: **+ New** → **Database** → **Add PostgreSQL**
2. Railway creates a Postgres instance; `DATABASE_URL` is auto-injected into your project environment

### Step 3 — (Optional) Add Redis
1. **+ New** → **Database** → **Add Redis**
2. `REDIS_URL` is auto-injected. The backend falls back gracefully if absent.

### Step 4 — Set backend environment variables
Railway → backend service → **Variables** tab:

| Variable       | Value                                                |
|----------------|------------------------------------------------------|
| `DATABASE_URL` | *(add reference → select the Postgres variable)*     |
| `REDIS_URL`    | *(add reference → select the Redis variable, or leave empty)* |
| `ENVIRONMENT`  | `production`                                         |
| `LOG_LEVEL`    | `INFO`                                               |
| `API_BASE_URL` | `https://<your-backend-railway-domain>` ← set after domain is generated |
| `CORS_ORIGINS` | `https://<your-vercel-domain>` ← set after Vercel deploys |

### Step 5 — Generate a public domain
Railway → backend service → **Settings** → **Networking** → **Generate Domain**

Copy the domain (e.g. `calsync-backend-production-xxxx.up.railway.app`). You'll need it for Vercel.

---

## Part 2: Deploy the Frontend on Vercel

### Step 1 — Import project
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → **Import Git Repository**
2. Select the `CalSync` repo

### Step 2 — Configure root directory
In the import settings:
- **Root Directory**: set to **`frontend`**
- Vercel auto-detects Next.js — no further framework config needed
- Do **not** override the build command or output directory

### Step 3 — Set environment variables
In the Vercel import flow (or later in Project → Settings → Environment Variables):

| Variable              | Value                                         |
|-----------------------|-----------------------------------------------|
| `NEXT_PUBLIC_API_URL` | `https://<your-backend-railway-domain>`       |

> **Critical:** `NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at build time. If you change this variable after the first deploy, you must **redeploy** (Vercel → Deployments → Redeploy latest) for it to take effect.

### Step 4 — Deploy
Click **Deploy**. Vercel builds from `frontend/` and publishes to a domain like `calsync.vercel.app`.

---

## Part 3: Wire the Two Together

Once both are deployed, update the backend variables in Railway with the real URLs:

| Variable       | Value                                    |
|----------------|------------------------------------------|
| `API_BASE_URL` | `https://<your-backend-railway-domain>`  |
| `CORS_ORIGINS` | `https://<your-vercel-domain>`           |

Railway will auto-redeploy the backend when variables change.

Then **trigger a Vercel redeploy** (Vercel → Deployments → Redeploy) to ensure `NEXT_PUBLIC_API_URL` is picked up — even if it was already set correctly during the initial deploy.

---

## Verification Checklist

After deployment, check each of these in order:

```
1. GET https://<railway-backend>/api/health
   → {"status":"ok","environment":"production"}

2. GET https://<railway-backend>/api/leagues
   → JSON array with 5 leagues (F1, IPL, NFL, NBA, MLS)
   → event_count > 0 for each (wait ~60s after deploy for ingestion)

3. Open https://<vercel-frontend>/browse
   → Leagues list loads (not placeholder data)

4. Select a league → Get Calendar
   → Modal shows a real hash URL (not demo-feed-abc123)
   → URL format: https://<railway-backend>/cal/<32-char-hash>.ics

5. Paste the webcal:// URL into Google Calendar
   → Events appear
```

If step 3 shows placeholder leagues or step 4 shows `demo-feed-abc123`, the frontend cannot reach the backend. Check `NEXT_PUBLIC_API_URL` in Vercel and redeploy.

---

## Common Problems

### Modal shows `demo-feed-abc123`
The frontend can't reach the backend. Causes:
- `NEXT_PUBLIC_API_URL` not set in Vercel, or set to `http://` instead of `https://`
- Variable was set but frontend wasn't redeployed afterwards
- CORS error — `CORS_ORIGINS` on the backend doesn't include the Vercel domain

**Fix:** Verify the variable in Vercel → Settings → Environment Variables, then Redeploy.

### Google Calendar shows 0 events
- The `.ics` URL contains `http://localhost:8000` — means `API_BASE_URL` on Railway is still localhost
- The backend DB is empty — ingestion hasn't completed yet. Wait 60 seconds and try again.

**Fix:** Set `API_BASE_URL` to the Railway HTTPS domain, save (Railway auto-redeploys).

### CORS errors in browser console
`CORS_ORIGINS` on the backend doesn't include the exact Vercel domain (including `https://`).

**Fix:** Railway → backend → Variables → update `CORS_ORIGINS` to `https://your-app.vercel.app`.

### `next/image` errors for team logos
A new image CDN hostname isn't in `frontend/next.config.ts` → `remotePatterns`.
See [docs/apis.md](apis.md) for the list of required hostnames.

---

## Environment Variable Summary

### Railway — Backend Service

| Variable       | Example                                                |
|----------------|--------------------------------------------------------|
| `DATABASE_URL` | auto-injected by Railway Postgres plugin               |
| `REDIS_URL`    | auto-injected by Railway Redis plugin (optional)       |
| `API_BASE_URL` | `https://calsync-backend-production-xxxx.up.railway.app` |
| `CORS_ORIGINS` | `https://calsync.vercel.app`                           |
| `ENVIRONMENT`  | `production`                                           |
| `LOG_LEVEL`    | `INFO`                                                 |

### Vercel — Frontend

| Variable              | Example                                                |
|-----------------------|--------------------------------------------------------|
| `NEXT_PUBLIC_API_URL` | `https://calsync-backend-production-xxxx.up.railway.app` |

---

## Redeployment

| Scenario                            | Action needed                                      |
|-------------------------------------|----------------------------------------------------|
| Backend code change                 | `git push` → Railway auto-deploys                  |
| Frontend code change                | `git push` → Vercel auto-deploys                   |
| Change `NEXT_PUBLIC_API_URL`        | Vercel → Deployments → Redeploy latest             |
| Change backend env var              | Railway auto-redeploys on save                     |
| Force backend data refresh          | Railway → backend → Deployments → Redeploy (restarts APScheduler + runs ingestion) |
