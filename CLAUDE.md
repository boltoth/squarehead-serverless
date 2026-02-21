# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- **Dev (full stack)**: From `frontend/`, run `vercel dev` — serves the React app and serverless API at e.g. http://localhost:3000
- **Dev (frontend only)**: From `frontend/`, run `npm run dev` — Vite on port 5181 (API calls will 404 unless you use `vercel dev`)
- **Build**: From `frontend/`, run `npm run build` (Vite production build)
- **Lint**: From `frontend/`, run `npm run lint`

## Architecture
- **Frontend**: React (Vite) in `frontend/`
- **API**: Vercel serverless functions in `frontend/api/` (Node.js); no separate backend
- **Database**: Supabase (PostgreSQL); schema in `supabase/schema.sql`

## Code Style Guidelines
- **Frontend**: React functional components with hooks
- **State**: Zustand for state management (`store/*.js`)
- **API**: Axios with interceptors in `services/api.js`; baseURL is `/api`
- **Custom hooks**: Follow `use` prefix pattern, export via `hooks/index.js`
- **Error handling**: Try/catch blocks with consistent logging
- **Components**: Feature-based organization, focused on reusability

## Naming & Organization
- React components: PascalCase (.jsx)
- Hooks/utils: camelCase with descriptive names
- API responses: Standardized via `lib/apiResponse.js` (success/error/validationError)

## Git Practices
- Commit format: `Type: Brief description` (Feature, Fix, Update, Docs)
- Test changes before committing
- Document significant changes in `/docs` directory
