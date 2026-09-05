# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (project root)
```bash
npm install
npm run dev        # Vite dev server → http://localhost:3000
npm run build
npm run preview
```

### Backend (`server/` directory)
```bash
npm install
npm run dev        # tsx watch → http://localhost:3001
npm run build      # Compile TypeScript to dist/ (also type-checks)
npm start          # Run compiled build
```

### Tests

Neither `package.json` defines a `test` script — invoke `vitest` directly.

```bash
# Backend (server/) — only place with real test files (tests/unit/**)
npx vitest run                                   # whole suite
npx vitest run tests/unit/middleware/auth.test.ts # single file
npx vitest                                        # watch mode

# Frontend (project root) — vitest + jsdom configured, but no test files exist yet
npx vitest run
```
Backend tests run with `NODE_ENV=test` (set in `server/vitest.config.ts`), pointing at `cytutor_test` DB with bcrypt rounds = 4 and Helmet/CSRF disabled.

### Database setup (run once in order, from `server/`)
```bash
npx tsx create_db.ts      # Create database
npm run migrate           # Apply schema.sql to database
npm run load-challenges   # Load from challenges.json
npm run load-tutorials    # Load tutorials
npm run load-courses      # Load courses
npm run seed              # Optional: seed sample data
```

### Targeted one-off migration scripts (from `server/`)
```bash
npm run migrate:otp          # Add OTP table if missing
npm run migrate:streak-fix   # Fix streak data inconsistencies
npm run migrate:classroom    # Add classroom feature tables
npm run migrate-tutorials    # Migrate tutorial content structure
npm run fix-streak-type      # Fix streak column type
npm run fix-courses          # Fix courses table structure
npm run load-content         # Reload tutorial/course content only
```

### Full-stack via Docker Compose (project root)
```bash
docker compose up          # Postgres + backend + challenge containers
```

### Pre-built challenge images (`Makefile`, project root)
```bash
make pull     # docker pull every cytutor/<id> image listed in the Makefile
make list     # docker images | grep cytutor
make clean    # remove all cytutor/* images
```
This pulls already-published images instead of building each `Challenges/<category>/<name>/Dockerfile` locally — useful for getting `web`/`terminal` challenges running quickly without a build step.

### Environment Variables

**Frontend** (`.env` in project root):
```
VITE_API_URL=http://localhost:3001/api
```
If `VITE_API_URL` is unset, the frontend falls back to `http://localhost:3001/api` at runtime.

**Backend** (`server/.env`):
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/cytutor
JWT_SECRET=your-secret-key
PORT=3001
NODE_ENV=development
CHALLENGE_PORT_MIN=10000
CHALLENGE_PORT_MAX=20000
CHALLENGE_TIMEOUT_MINUTES=45
FRONTEND_URL=http://localhost:3000
HOST_IP=           # Optional: override auto-detected IP for challenge URLs
CORS_ORIGINS=      # Required in production: comma-separated allowed origins
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=        # Optional: if unset, email service is disabled
EMAIL_PASS=
```

`DATABASE_URL` and `JWT_SECRET` are required — the backend throws on startup if missing.

---

## Architecture

### Request Flow

```
Frontend (HashRouter, :3000)
  → services/api.ts (Axios, baseURL = VITE_API_URL)
  → Express backend (:3001)
  → middleware: Helmet → CORS → sanitize → rate-limit → auth.ts (JWT)
  → routes/ → db (pg Pool) / Docker (child_process.exec)
```

The Express app is split: `server/src/app.ts` creates and configures the app (registering all routes and middleware), while `server/src/index.ts` starts the server and initializes services (port manager, email, cleanup intervals).

### Auth State

Auth state lives entirely in `App.tsx` as a `useState<User | null>` — there is **no AuthContext**. On load, `App.tsx` reads `localStorage.getItem('cytutor_token')` and calls `users.getMe()` to rehydrate the session. The `user` prop and `onLogout`/`onUpdateUser` callbacks are drilled into pages via `<Layout>`.

The one React Context that does exist is `ThemeContext` (`src/contexts/ThemeContext.tsx`) — it exposes `{ theme, toggleTheme }` and is consumed via `useTheme()`.

The frontend uses **HashRouter** (not BrowserRouter), so all routes are prefixed with `#`. This matters for any redirect logic or link generation.

### Authentication Flow

The auth flow starts with a pre-flight: `POST /auth/check-email` determines whether an email is new (→ register) or existing (→ login), so `Auth.tsx` shows a single entry field before branching.

Sign-up is OTP-gated: `POST /auth/register` hashes the password and sends a 6-digit OTP to the user's email; no account is created yet. `POST /auth/verify-otp` verifies the code, creates the user record, and issues the JWT. OTPs expire in 10 minutes. Password reset follows the same OTP pattern via `/auth/forgot-password` + `/auth/reset-password`.

### `authenticate` Middleware

Every protected route calls `authenticate` from `server/src/middleware/auth.ts`. Unlike a pure JWT decode, it **hits the database** on each request to fetch the user's current `role` from the `users` table. It attaches both `req.userId` (string) and `req.user` (`{ id, role }`).

### API Client (`services/api.ts`)

The Axios instance has `baseURL = VITE_API_URL`. Route paths start with `/auth/`, `/users/`, etc. — the `/api` prefix is already included in `VITE_API_URL` (not added again in the route calls).

Named exports: `auth`, `users`, `challenges`, `tutorials`, `classrooms`. The default export is the raw Axios instance.

Additional API modules: `services/analyticsApi.ts` (analytics endpoints) and `services/courseApi.ts` (course-specific endpoints) supplement `api.ts`. `services/locationService.ts` handles onboarding geo-detection (browser Geolocation API → ipapi.co fallback → browser timezone fallback).

### TypeScript Types

Shared frontend types live in two locations:
- `src/types.ts` — core domain types (`User`, `UserStats`, `Challenge`, `Tutorial`, `AuthStep`, classroom/assignment types)
- `src/types/course.ts` and `src/types/tutorial.ts` — richer types for the course and tutorial content structures (JSONB sections, modules, etc.)

### Challenge System — Two Config Files

Challenges have two separate definitions that must stay in sync:
- **`challenges.json`** (project root) — Full definition: title, category, difficulty, points, description, flag, hints, `challenge_type`
- **`server/src/orchestrator/challenge-registry.json`** — Docker mapping: id → `{ image, internalPort }` — auto-regenerated by `npm run load-challenges`; only needed for `web`/`terminal` types

Only `challenge_type: "web"` or `"terminal"` spins up a Docker container. Types `"description"` and `"downloadable"` skip Docker entirely and accept direct flag submission.

**Challenge status values** (from `user_challenges.status`, defaulting to `available` when no row exists): `available` → `running` → `stopped` / `completed` / `expired`. `locked` is defined in the README as a planned state but is not enforced in the current codebase.

**Flag evaluation**: Case-sensitive exact string match against the flag stored in the `challenges` table. Flag format throughout the platform is `Cytutor{...}`. No penalty for wrong attempts; a challenge can only be completed once per user.

**Single-instance enforcement**: `ChallengeManager.startChallenge()` stops all other running containers for the user before starting a new one. A user can only have one active challenge at a time.

**Container URL**: The host IP in the returned URL is auto-detected via `os.networkInterfaces()` (first non-internal IPv4). Override with `HOST_IP` env var if auto-detection picks the wrong interface.

### Challenge Lifecycle (3 phases)

**Phase 1 — Build time** (manual, once per challenge):
`Challenges/<category>/<name>/Dockerfile` → `docker build -t cytutor/<id> .` → Docker image on host

**Phase 2 — Setup time** (`npm run load-challenges`):
`challenges.json` → inserted into PostgreSQL `challenges` table (including the flag) → `challenge-registry.json` rewritten

**Phase 3 — Runtime** (per user action):
- *Start*: DB lookup → registry lookup → allocate port from `ports` table → `docker run` → upsert `user_challenges` row → return URL
- *Submit flag*: fetch flag from `challenges` table → compare → award XP/points if correct
- *Auto-cleanup*: after 45 min timeout → `docker stop/rm` → free port → `user_challenges` status=`expired`

Containers are named `user-{userId_first_8}-{challengeId}` and are resource-limited (256 MB RAM, 0.5 CPU).

### Classroom System

The classroom feature (`server/src/routes/classrooms.ts`, ~800 lines) enables mentor-led groups with assignments and leaderboards. Key concepts:
- A mentor creates a classroom; students join via invite code
- Assignments reference either a global `challenges.json` challenge or a classroom-specific challenge
- **Classroom-specific challenges are restricted to `description` or `downloadable` only** — no Docker containers
- Each classroom has its own leaderboard scoped to members
- The `classrooms` named export in `services/api.ts` covers all member/assignment/leaderboard endpoints

### Database — Schema is the Source of Truth

`server/src/db/schema.sql` is the authoritative schema. `migrate.ts` reads and executes `schema.sql` directly — there is no `migrations/` directory. For additive changes, add a targeted script in `server/src/db/` and register it as an npm script (see the existing `migrate:otp` pattern), rather than just editing `schema.sql` on a live database.

In practice, `schema.sql` is missing the classroom feature entirely — `classrooms`, `classroom_members`, `classroom_challenges`, `assignments`, `assignment_submissions`, and the `users.role` column all live only in `migrate-classroom.ts` (run via `npm run migrate:classroom`). Don't assume `schema.sql` reflects every table in the live database.

**Key tables:**

| Table | Purpose |
|-------|---------|
| `users` | Auth + profile data; UUID primary keys |
| `otps` | Email OTP codes (signup / forgot_password); expire in 10 min |
| `user_stats` | Points, XP, level, streaks, `activity_history` (DATE[]), global rank |
| `challenges` | Definitions loaded from `challenges.json`; stores the correct flag |
| `user_challenges` | Live Docker container state per user (container_id, port, status) |
| `ports` | Atomic port pool 10000–20000; allocated via `SELECT FOR UPDATE SKIP LOCKED` |
| `tutorials` | Learning content with structured `JSONB` sections |
| `courses` + `course_modules` | Ordered groups of tutorials |
| `user_tutorial_progress` / `user_course_progress` | Per-user learning progress |
| `tutorial_ratings` | 1–5 star ratings + feedback |

**Non-obvious details:**
- `user_stats.activity_history` is a PostgreSQL `DATE[]` array — not a separate table
- `user_stats.streak_claimed_today` is not reset by a cron job — `streakService.checkAndUpdateStreak()` treats the claim as stale the moment `last_active_date` no longer equals "today" in the user's timezone, so it self-resets on the next request of a new day
- `challenges.id` is TEXT (slug like `"power-cookie"`); all user IDs are UUIDs
- `user_challenges` uses composite PK `(user_id, challenge_id)` — upserted on each start
- Level formula: `floor(total_xp / 1000) + 1`
- Global rank formula: count of users with more `total_points` + 1 (recalculated on every correct flag submission)

### Services Layer (`server/src/services/`)

Streak logic is split across two files: `timezoneService.ts` does IST-aware (`Asia/Kolkata` by default) date math (`getTodayInTimezone`, `isDateBefore`, etc.), and `streakService.ts` uses those helpers inside a row-locked transaction (`SELECT ... FOR UPDATE`) to decide `extended`/`frozen`/`broken`/`new` and compute XP/point rewards. `scheduler.ts` only drives two `node-cron` jobs (daily streak reminder, missed-streak check) that call into `notificationService.ts`, which depends on a `user_notifications` table to avoid sending the same email twice in a day — it is unrelated to streak-flag resets. `tutorialService.ts` tracks per-user tutorial progress independent of the streak system.

### Background Jobs

`server/src/index.ts` sets up two `setInterval` cleanup loops (separate from the cron jobs in `scheduler.ts`):
- **Challenge cleanup** every 5 minutes — calls `challengeManager.cleanupExpiredChallenges()` to stop containers older than 45 minutes
- **OTP cleanup** every 10 minutes — deletes expired OTP rows from the DB

### Backend Config (`server/src/config/index.ts`)

Environment-specific config is selected by `NODE_ENV`:
- **Development**: CORS allows `localhost:3000` and `localhost:5173`; CSRF disabled
- **Production**: CORS requires explicit `CORS_ORIGINS` env var (empty = no CORS); CSRF enabled; `cookieSecure: true`; HSTS + CSP headers active
- **Test**: Server on port 3002; Helmet/CSRF disabled; bcrypt rounds = 4

### Adding an API Endpoint

1. Add route handler in `server/src/routes/<resource>.ts`
2. Register router in `server/src/app.ts`
3. Add corresponding method in `services/api.ts` (frontend)

Protected routes require the `authenticate` middleware from `server/src/middleware/auth.ts` — it reads `Authorization: Bearer <token>`, verifies the JWT, queries the DB for role, and attaches `req.userId` and `req.user`.

### Backend Error Handling

Route handlers should throw `AppError` (from `server/src/middleware/errorHandler.ts`) for operational errors — it accepts `(statusCode, message)` and is caught by the global error handler, which strips details in production. For async handlers, either use a try/catch or wrap with `asyncHandler`:

```ts
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

router.get('/foo', authenticate, asyncHandler(async (req, res) => {
  throw new AppError(404, 'Not found'); // automatically forwarded to error handler
}));
```

### Backend ESM Import Style

The backend is compiled as ES modules (`"type": "module"` in `server/package.json`). All relative imports in TypeScript files **must use `.js` extensions**, even though the actual source files are `.ts`:

```ts
import { query } from '../db/index.js';   // correct — .js not .ts
import config from '../config/index.js';  // correct
```

### Frontend Toast Notifications

Use the `useToast` hook (`src/hooks/useToast.ts`) with the `Toast` component for in-page notifications. The hook auto-dismisses after 4 seconds:

```tsx
const { toast, showToast, dismissToast } = useToast();
showToast({ type: 'success', message: 'Flag submitted!' });
// render: <Toast toast={toast} onDismiss={dismissToast} />
```

### Health Check Endpoint

`GET /health` (not under `/api`) returns `{ status, environment, timestamp }` — useful for verifying the backend is running without authentication.

### Styling

Tailwind CSS is loaded via **CDN** (`index.html`), not installed as a package. There is no `tailwind.config.js`. Custom color tokens (`text-neon-green`, `bg-void`, `bg-card`, `bg-glass`) are defined in the inline `tailwind.config` block inside `index.html`. Light/dark theme state is persisted via `localStorage('cytutor_theme')` and applied as `data-theme` on `<html>` — colors are CSS custom properties overridden per theme.

### `@` Import Alias

The Vite `@` alias points to `./src` (i.e., the `src/` subdirectory), not the project root. Configured in `vite.config.ts` and mirrored in `tsconfig.json` paths.

### Further Documentation

`docs/` (project root) has deep-dive write-ups on specific subsystems:
- `System_Architecture.md` — functional architecture, challenge matrix, reward/level formulas
- `DEPLOYMENT.md` — production setup (Nginx, SSL, Docker Compose)
- `AUTH_SETUP.md` — email verification and OTP configuration
- `STREAK_FLOW_DIAGRAM.md` / `STREAK_QUICK_REFERENCE.md` — streak state machine
- `NEWCOMER_GUIDE.md` — onboarding walkthrough for new contributors
- `system_design.md`, `Project_Writeup.md`, `Literature_Survey.md` — academic documentation

Check there before re-deriving the design of a subsystem from scratch.
