# Square Dance Club Management System

A modern web application for managing square dance club rosters, duty assignments, and member communications. It runs entirely on **Vercel** (frontend + serverless API) with **Supabase** (PostgreSQL).

## Features

- **Member Management**: Add, edit, and organize club members with contact information
- **Interactive Map**: View member locations with cached geocoding for optimal performance
- **Schedule Management**: Create and manage duty assignments for dance nights
- **Email Reminders**: Automated email notifications for assigned squareheads
- **Admin Panel**: Club settings, email templates, and system configuration
- **CSV Import/Export**: Bulk member data management
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Frontend**: React 18, React Router 6, Bootstrap, Zustand, React Query, Vite
- **API**: Vercel serverless functions (Node.js) under `/api/*`
- **Database**: Supabase (PostgreSQL)
- **Auth**: Magic-link + JWT (tokens in `login_tokens` table)

## Project Structure

```
squarehead-serverless/
├── frontend/              # React app + Vercel API
│   ├── src/               # React components, pages, hooks, store
│   ├── api/               # Serverless API routes (Vercel)
│   ├── lib/                # Shared server-side helpers (Supabase, JWT, auth)
│   ├── package.json
│   └── vercel.json
├── supabase/
│   └── schema.sql         # PostgreSQL schema (run once in Supabase SQL Editor)
├── docs/
└── README.md
```

## Quick Start

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the contents of `supabase/schema.sql`.
3. Note your **Project URL** and **service_role** key (Settings → API).

### 2. Local development

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
vercel dev
```

This serves the app and API at http://localhost:3000 (or the port Vercel reports). Use this for full-stack local development.

### 3. Deploy to Vercel

```bash
cd frontend
vercel
```

Set **Root Directory** to `frontend` (or deploy from inside `frontend`). In the Vercel project, add environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, and SMTP vars if you use email.

Full deployment steps and env vars: **[docs/DEPLOYMENT_VERCEL_SUPABASE.md](docs/DEPLOYMENT_VERCEL_SUPABASE.md)**

## Database

Tables (in Supabase): `users`, `login_tokens`, `settings`, `schedules`, `schedule_assignments`. Schema is in `supabase/schema.sql`.

## License

Private project for square dance club management.
