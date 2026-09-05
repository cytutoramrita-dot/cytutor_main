# Mentored Classroom — Feature Blueprint

A structured learning environment where faculty (mentors) manage student groups, assign daily challenges as homework, and author classroom-private challenges — all within the existing CyTutor platform.

---

## Table of Contents

- [Concept](#concept)
- [Roles](#roles)
- [Feature Summary](#feature-summary)
- [Data Model](#data-model)
- [User Flows](#user-flows)
  - [Mentor Flow](#mentor-flow)
  - [Student Flow](#student-flow)
- [Assignment System](#assignment-system)
- [Classroom Challenges (Mentor-Authored)](#classroom-challenges-mentor-authored)
- [API Endpoints](#api-endpoints)
- [Frontend Pages](#frontend-pages)
- [Implementation Plan](#implementation-plan)
- [Out of Scope (v1)](#out-of-scope-v1)

---

## Concept

```
Mentor (Faculty)
    │
    ├─ creates Classroom "CSE Batch A"
    │       generates invite code
    │
    ├─ assigns daily homework
    │       pick from: global CyTutor challenges  ←── existing challenges.json pool
    │                  classroom-private challenges ←── mentor creates these
    │
    └─ views class progress dashboard

Students
    │
    ├─ join classroom via invite code
    ├─ see pending assignments on dashboard
    ├─ solve challenge → submit flag → marks assignment done
    └─ see due dates, scores, and class leaderboard
```

---

## Roles

Three roles total. Stored as a `role` column on the `users` table.

| Role | Value | Who |
|------|-------|-----|
| Student | `student` (default) | All existing users |
| Mentor | `mentor` | Faculty — promoted by admin or self-selected at registration |
| Admin | `admin` | Platform owner (future) |

Add `role TEXT NOT NULL DEFAULT 'student'` to `users`. Existing rows default to `student`.

---

## Feature Summary

| Feature | Mentor | Student |
|---------|--------|---------|
| Create classroom | ✅ | ✗ |
| Share invite code | ✅ | ✗ |
| View enrolled students | ✅ | ✗ |
| Assign homework (existing challenge) | ✅ | ✗ |
| Assign homework (custom challenge) | ✅ | ✗ |
| Set due date on assignment | ✅ | ✗ |
| View class submission progress | ✅ | ✗ |
| Join classroom via invite code | ✗ | ✅ |
| View pending assignments | ✗ | ✅ |
| Submit flag for assignment | ✗ | ✅ |
| See assignment result & score | ✗ | ✅ |
| View class leaderboard | ✅ | ✅ |

---

## Data Model

### New tables

#### `classrooms`

```sql
CREATE TABLE classrooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  mentor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code  TEXT NOT NULL UNIQUE,   -- 8-char alphanumeric, e.g. "CYT-A4X2"
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `classroom_members`

```sql
CREATE TABLE classroom_members (
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (classroom_id, user_id)
);
```

#### `classroom_challenges`

Mentor-authored challenges scoped to a single classroom. Same structure as global challenges but private.

```sql
CREATE TABLE classroom_challenges (
  id             TEXT PRIMARY KEY,         -- slug, e.g. "batch-a-sqli-1"
  classroom_id   UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  category       TEXT NOT NULL,
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  points         INTEGER NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('description','downloadable','web','terminal')),
  flag           TEXT NOT NULL,
  hints          TEXT[],
  created_by     UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> For `web`/`terminal` classroom challenges, the mentor must also build and register a Docker image manually (same as global challenges). v1 can restrict mentor-authored challenges to `description` and `downloadable` types to avoid requiring Docker access.

#### `assignments`

```sql
CREATE TABLE assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id          UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  created_by            UUID NOT NULL REFERENCES users(id),
  title                 TEXT NOT NULL,
  instructions          TEXT,

  -- source: one of these two is set, not both
  global_challenge_id   TEXT REFERENCES challenges(id),
  classroom_challenge_id TEXT REFERENCES classroom_challenges(id),

  due_date              TIMESTAMPTZ,
  assigned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT one_challenge_source CHECK (
    (global_challenge_id IS NOT NULL)::int +
    (classroom_challenge_id IS NOT NULL)::int = 1
  )
);
```

#### `assignment_submissions`

```sql
CREATE TABLE assignment_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_flag TEXT NOT NULL,
  is_correct    BOOLEAN NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 1,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, user_id)   -- one submission record per student per assignment
                                    -- update on retry
);
```

### Modified tables

#### `users` — add `role`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
```

---

## User Flows

### Mentor Flow

```
1. Register / switch to mentor role
        ↓
2. Create Classroom
   POST /classrooms
   { name, description }
   ← { id, invite_code: "CYT-A4X2" }
        ↓
3. Share invite_code with students (out-of-band: email, LMS, etc.)
        ↓
4. Assign Daily Homework
   POST /classrooms/:id/assignments
   {
     title: "Day 3 Homework — XSS Basics",
     instructions: "Solve the reflected XSS challenge and submit the flag.",
     global_challenge_id: "ref-xss",   // OR classroom_challenge_id
     due_date: "2026-04-22T23:59:00Z"
   }
        ↓
5. (Optional) Create a classroom-private challenge
   POST /classrooms/:id/challenges
   {
     title: "Internal SQLi Test",
     description: "...",
     challenge_type: "description",
     flag: "Cytutor{internal_flag}",
     difficulty: "Medium",
     points: 50
   }
        ↓
6. Monitor progress
   GET /classrooms/:id/assignments/:assignmentId/progress
   ← list of students, submitted_at, is_correct, attempts
```

### Student Flow

```
1. Join classroom via invite code
   POST /classrooms/join
   { invite_code: "CYT-A4X2" }
        ↓
2. View pending assignments on dashboard
   GET /classrooms/my/assignments
   ← [ { assignment, due_date, status: 'pending'|'submitted'|'overdue' } ]
        ↓
3. Click assignment → opens challenge (same UI as regular challenges)
        ↓
4. Solve challenge, copy flag
        ↓
5. Submit flag for the assignment
   POST /assignments/:id/submit
   { flag: "Cytutor{reflected_xss_win}" }
   ← { correct: true, points_awarded: 20 }
        ↓
6. Assignment marked as completed; points awarded to user_stats
```

---

## Assignment System

### Assignment statuses (computed, not stored)

| Status | Condition |
|--------|-----------|
| `pending` | No submission yet, due_date in future (or no due_date) |
| `submitted` | `assignment_submissions.is_correct = true` |
| `failed` | Submission exists, `is_correct = false`, due_date not passed |
| `overdue` | No correct submission, due_date has passed |

### Flag submission for assignments

1. Fetch assignment → get `global_challenge_id` or `classroom_challenge_id`
2. Fetch correct flag from `challenges.flag` or `classroom_challenges.flag`
3. Compare submitted flag (case-sensitive exact match)
4. On correct: upsert `assignment_submissions` with `is_correct=true`, award points via existing `user_stats` XP logic
5. On wrong: upsert with `is_correct=false`, increment `attempts`

> Points are awarded **once** per assignment even if the student already solved the same global challenge outside the classroom.

### Daily homework pattern

Mentor assigns one challenge per day. Nothing in the system enforces "one per day" — the mentor simply creates assignments whenever needed. The `assigned_at` timestamp and `due_date` communicate timing to students.

---

## Classroom Challenges (Mentor-Authored)

v1 restricts mentor-created challenges to `description` and `downloadable` types — no Docker required.

### Create flow

```
Mentor fills form:
  - Title, description, category, difficulty, points
  - Challenge type: description | downloadable
  - Flag (plain text)
  - Hints (optional list)
  - File attachment URL (if downloadable)

POST /classrooms/:id/challenges
→ inserts into classroom_challenges
→ challenge is only visible inside this classroom
```

### Assigning a classroom challenge

```
POST /classrooms/:id/assignments
{
  classroom_challenge_id: "batch-a-sqli-1",
  due_date: "..."
}
```

The submission route checks `classroom_challenges.flag` when `classroom_challenge_id` is set.

---

## API Endpoints

All routes require JWT auth. Mentor-only routes additionally check `req.user.role === 'mentor'`.

### Classrooms

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/classrooms` | mentor | Create classroom |
| `GET` | `/classrooms/my` | mentor | List mentor's classrooms |
| `GET` | `/classrooms/:id` | member | Get classroom details |
| `POST` | `/classrooms/join` | student | Join via invite code |
| `GET` | `/classrooms/:id/members` | mentor | List enrolled students |
| `DELETE` | `/classrooms/:id/members/:userId` | mentor | Remove student |
| `PATCH` | `/classrooms/:id` | mentor | Update name/description |
| `DELETE` | `/classrooms/:id` | mentor | Deactivate classroom |

### Assignments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/classrooms/:id/assignments` | mentor | Create assignment |
| `GET` | `/classrooms/:id/assignments` | member | List assignments |
| `GET` | `/classrooms/my/assignments` | student | All assignments across all classrooms |
| `PATCH` | `/classrooms/:id/assignments/:aId` | mentor | Edit due date / instructions |
| `DELETE` | `/classrooms/:id/assignments/:aId` | mentor | Remove assignment |
| `GET` | `/classrooms/:id/assignments/:aId/progress` | mentor | Per-student submission status |
| `POST` | `/assignments/:id/submit` | student | Submit flag |

### Classroom Challenges

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/classrooms/:id/challenges` | mentor | Author a new classroom challenge |
| `GET` | `/classrooms/:id/challenges` | member | List classroom challenges |
| `PATCH` | `/classrooms/:id/challenges/:cId` | mentor | Edit challenge |
| `DELETE` | `/classrooms/:id/challenges/:cId` | mentor | Delete challenge |

---

## Frontend Pages

### New pages / routes

| Route | Who sees it | Description |
|-------|-------------|-------------|
| `#/classrooms` | Mentor | List of own classrooms + "Create" button |
| `#/classrooms/:id` | Member | Classroom home: assignments list, leaderboard tab |
| `#/classrooms/:id/manage` | Mentor | Members list, assignment creation, challenge authoring |
| `#/classrooms/:id/assignments/new` | Mentor | Assignment creation form |
| `#/classrooms/:id/challenges/new` | Mentor | Classroom challenge authoring form |
| `#/assignments/:id` | Student | Assignment detail + challenge embed + flag submission |

### Dashboard changes

- Add **"My Classrooms"** section on the student dashboard showing pending assignments with due dates and a progress bar
- Add **"My Classrooms"** section on the mentor dashboard showing submission completion rates per assignment

### Assignment creation form (mentor)

```
Title:         [_____________________]
Instructions:  [_____________________]  (optional extra context)

Challenge source:
  ○ Pick from CyTutor challenges
      [Search / filter existing challenges ↓]
  ○ Create a new classroom challenge
      [inline challenge creation form]

Due date:      [date picker]  (optional)

[ Assign ]
```

---

## Implementation Plan

Run in order — each step is independently testable.

### Phase 1 — Schema & Auth

1. Write migration: `server/src/db/migrate-classroom.ts`
   - Add `role` to `users`
   - Create `classrooms`, `classroom_members`, `classroom_challenges`, `assignments`, `assignment_submissions`
2. Register `"migrate:classroom": "tsx src/db/migrate-classroom.ts"` in `package.json`
3. Run `npm run migrate:classroom`
4. Add `role` field to `User` type in `types.ts` (frontend)
5. Update `auth` middleware to expose `req.user.role`

### Phase 2 — Classroom CRUD

6. `server/src/routes/classrooms.ts` — create, list, join, get, delete endpoints
7. Register router in `server/src/index.ts`
8. `services/api.ts` (frontend) — add `classrooms` API methods
9. Frontend: `#/classrooms` list page + create classroom modal

### Phase 3 — Assignments

10. Assignment endpoints in `classrooms.ts` router (or separate `assignments.ts`)
11. Frontend: assignment creation form (challenge picker with search/filter)
12. Student dashboard widget — pending assignments
13. `POST /assignments/:id/submit` — flag validation + XP award

### Phase 4 — Classroom Challenges

14. `classroom_challenges` CRUD endpoints
15. Frontend: classroom challenge authoring form (description/downloadable only for v1)
16. Wire submission route to check `classroom_challenges.flag` when relevant

### Phase 5 — Progress & Polish

17. `GET /classrooms/:id/assignments/:aId/progress` — mentor progress view
18. Class leaderboard (rank by total assignment points within classroom)
19. Email notification to students when a new assignment is posted (uses existing `email.ts` service)

---

## Out of Scope (v1)

The following are intentional deferrals to keep v1 focused:

| Feature | Reason deferred |
|---------|----------------|
| Docker-based mentor-authored challenges | Requires mentor to have Docker/server access |
| Team assignments (group submissions) | Significant extra schema complexity |
| Grading rubrics / partial credit | Overkill for flag-based challenges |
| LMS integration (Moodle, Canvas) | Separate integration project |
| Mentor analytics dashboard | Nice-to-have; can use progress endpoint directly |
| Student late-submission policy | Can be handled manually by mentor for now |
| Multiple mentors per classroom | Simpler to have one owner in v1 |
