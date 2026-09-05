# Newcomer Guide: CyTutor Codebase

This guide gives a quick mental model of how CyTutor is organized and where to start reading.

## 1) Big picture

CyTutor is a full-stack cybersecurity learning platform:
- **Frontend**: React + TypeScript single-page app.
- **Backend**: Express + TypeScript REST API.
- **Database**: PostgreSQL for users, content, progress, and challenge state.
- **Challenge runtime**: Docker containers launched on demand for hands-on labs.

The architecture is documented in the main README and reflected in code structure under the repo root and `server/`.

## 2) Repository layout (what lives where)

- `App.tsx`, `pages/`, `components/`, `services/`: Frontend application code.
- `server/src/index.ts`: Backend entrypoint and middleware/route wiring.
- `server/src/routes/`: API endpoints by domain (`auth`, `users`, `challenges`, etc.).
- `server/src/db/`: SQL schema and database scripts (migrations/loaders/seeding).
- `server/src/orchestrator/`: Docker challenge lifecycle and port allocation.
- `Challenges/`: Source code/assets for individual challenge environments.
- `challenges.json` + registry files: Challenge metadata used for loading/serving.
- `tutorials.json`: Tutorial content metadata.

## 3) Frontend flow

`App.tsx` is the front door:
- Initializes session by checking for `cytutor_token`.
- Fetches current user via `users.getMe()`.
- Gates routes based on auth/profile-completion state.
- Uses `HashRouter`, protected route wrappers, and page-level components.

`services/api.ts` centralizes Axios setup:
- API URL resolution from `VITE_API_URL`.
- Automatic bearer token attachment via request interceptor.
- Basic 401 handling (token cleanup).

When adding frontend features, follow this pattern:
1. Add or update endpoint call in `services/`.
2. Use it in a page/component.
3. Keep shared types in `types.ts` and `types/` in sync.

## 4) Backend flow

`server/src/index.ts` does the backend assembly:
- Loads security middleware (Helmet/CORS/sanitization/rate limit).
- Registers feature routes under `/api/*`.
- Exposes `/health` for liveness checks.
- Initializes challenge and OTP cleanup intervals.

Route handlers in `server/src/routes/` are thin and delegate:
- DB work goes through `query(...)` in `server/src/db/index.ts`.
- Challenge lifecycle actions call `challengeManager`.
- Auth checks are enforced via middleware (`authenticate`).

## 5) Docker challenge orchestration (core differentiator)

`server/src/orchestrator/challengeManager.ts` is a key file:
- Reads a challenge registry and validates challenge type.
- Enforces one running challenge instance per user.
- Allocates a free host port through `portManager`.
- Starts containers with CPU/RAM limits.
- Stores container/port/status in `user_challenges`.
- Handles explicit stop/reset and background expiration cleanup.

If challenge launch/teardown bugs happen, debug here first (then `portManager.ts`, Docker daemon status, and DB `user_challenges` state).

## 6) Data model essentials

The DB schema (`server/src/db/schema.sql`) defines core entities:
- `users`, `otps`, `user_stats` for identity/gamification.
- `challenges`, `user_challenges` for challenge catalog and progress/runtime.
- `tutorials`, `courses`, and user progress tables.
- `ports` for atomic challenge port allocation.

A practical way to reason about product features is mapping each screen/API to these tables.

## 7) Important operational/config concepts

Backend config is centralized in `server/src/config/index.ts`:
- Fails fast if required env vars are missing (`DATABASE_URL`, `JWT_SECRET`).
- Encodes environment-specific behavior for CORS/security/logging.
- Defines challenge port range and timeout controls.

Before deep debugging, verify env config first—it drives many runtime behaviors.

## 8) Suggested learning path for newcomers

1. **Read root `README.md`** for architecture and local setup.
2. **Trace one user journey end-to-end** (e.g., login or start challenge):
   - Frontend page -> `services/api.ts` -> backend route -> DB/service.
3. **Read `server/src/index.ts`** to understand middleware + route wiring.
4. **Study `server/src/routes/challenges.ts` + `challengeManager.ts`** to grasp container lifecycle.
5. **Review `server/src/db/schema.sql`** to build DB intuition.
6. **Run locally and inspect `/health` + API responses** while stepping through code.

## 9) Good first contributions

- Small UI improvements in `pages/` or `components/`.
- Better API error states (frontend + backend route responses).
- Challenge UX refinements around start/stop/reset feedback.
- Tests or scripts around DB loaders and challenge lifecycle edges.

## 10) Common pitfalls

- Mismatch between challenge metadata (`challenges.json`/registry) and DB-loaded records.
- Missing Docker images or blocked port range causing start failures.
- Environment misconfiguration (JWT/DB/CORS) causing confusing auth/network errors.
- Forgetting to keep shared type definitions aligned between frontend and backend expectations.
