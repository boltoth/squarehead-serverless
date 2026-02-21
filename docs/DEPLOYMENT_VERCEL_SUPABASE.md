# Deploying to Vercel and Supabase

This project can be deployed as a **serverless** stack: **Vercel** (frontend + API routes) and **Supabase** (PostgreSQL + optional Auth).

## Overview

- **Vercel** hosts the React app and serverless API routes (Node.js) under `/api/*`.
- **Supabase** provides the PostgreSQL database. Run the schema in the Supabase SQL Editor once.
- Auth remains **magic-link + JWT** (tokens in `login_tokens` table, JWT signed with `JWT_SECRET`).

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open **SQL Editor** and run the contents of **`supabase/schema.sql`** (from the repo root).
3. In **Project Settings → API**, note:
   - **Project URL** → use as `SUPABASE_URL`
   - **service_role** key (under "Project API keys") → use as `SUPABASE_SERVICE_ROLE_KEY` (keep secret).

(Optional) Seed an admin user and a setting:

```sql
INSERT INTO users (email, first_name, last_name, role, is_admin)
VALUES ('your@email.com', 'Admin', 'User', 'admin', true);
```

## 2. Vercel setup

1. Install Vercel CLI: `npm i -g vercel`.
2. From the **project root**, link and deploy the **frontend** (Vercel uses the `frontend` folder as the application root):

   ```bash
   cd frontend
   npm install
   vercel
   ```

   When prompted, set **Root Directory** to `.` (current directory, i.e. `frontend`). If you deploy from the repo root instead, set Root Directory to `frontend` in the Vercel project settings.

3. In the Vercel project **Settings → Environment Variables**, add:

   | Name | Value | Notes |
   |------|--------|--------|
   | `SUPABASE_URL` | Your Supabase project URL | Required |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | Required, secret |
   | `JWT_SECRET` | A long random string | Required for auth; e.g. `openssl rand -hex 32` |
   | `SMTP_HOST` | Your SMTP host | For login/reminder emails |
   | `SMTP_PORT` | e.g. `587` | |
   | `SMTP_USER` | SMTP username | |
   | `SMTP_PASS` | SMTP password | Secret |
   | `SMTP_FROM` | From address for emails | Optional |

   For **login links** to point to your app, either rely on Vercel’s default (e.g. `https://your-project.vercel.app`) or set:

   - `VERCEL_URL` is set automatically by Vercel; the app uses it to build the login link host when present.

4. Redeploy after changing env vars: **Deployments → … → Redeploy**.

## 3. Local development with serverless stack

1. Copy env into `frontend/.env.local` (or `frontend/.env`):

   ```bash
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JWT_SECRET=your_jwt_secret
   ```

2. Run the app and API locally with Vercel Dev:

   ```bash
   cd frontend
   npm install
   vercel dev
   ```

   This serves the app and `/api/*` routes locally (e.g. http://localhost:3000). There is no separate backend; the API runs as serverless functions.

## 4. Build and deploy

- **Build**: from the `frontend` directory, `npm run build` (Vite).
- **Output**: `frontend/dist` (set as **Output Directory** in Vercel if you deploy from repo root).
- **API**: All routes under `frontend/api/*.js` are deployed as serverless functions (no extra config if Root Directory is `frontend`).

## 5. Post-deploy checks

- Open `https://your-project.vercel.app/api/health` → should return `{"status":"healthy",...}`.
- Open `https://your-project.vercel.app/api/status` → should show `database.status: "connected"` when Supabase env vars are set.
- Log in with magic link (or seed user) and confirm members, settings, and schedules load.

## 6. Optional: Supabase Auth

The current setup uses the existing **magic-link + JWT** flow (tokens in `login_tokens`, JWT from your API). To move to **Supabase Auth** (magic link via Supabase):

- Enable Email auth in Supabase and use `supabase.auth.signInWithOtp()` and session from Supabase on the frontend.
- Either replace your JWT with Supabase session checks in API routes, or keep JWT and issue it after verifying the Supabase session in a custom endpoint.

The schema and API in this repo do **not** require Supabase Auth; the table `login_tokens` and the `/api/auth/send-login-link` and `/api/auth/validate-token` routes are enough for the current app.
