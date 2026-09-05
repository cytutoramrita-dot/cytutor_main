# CyTutor — System Architecture & Usage Guide

**Team #06 | Batch: 22UCYS | TIFAC-CORE in Cyber Security, Amrita School of Computing, Coimbatore**

---

## Table of Contents

1. [Functional Architecture](#1-functional-architecture)
2. [Challenge Complexity Matrix](#2-challenge-complexity-matrix)
3. [Technical Architecture](#3-technical-architecture)
4. [How to Use the System](#4-how-to-use-the-system)
5. [How the System Evaluates](#5-how-the-system-evaluates)

---

## 1. Functional Architecture

CyTutor is organized around four functional domains that work together to deliver a complete cybersecurity learning experience.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CYTUTOR PLATFORM                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐ │
│  │  IDENTITY &  │  │  CHALLENGE   │  │   LEARNING   │  │  GAME  │ │
│  │    ACCESS    │  │  EXECUTION   │  │   CONTENT    │  │  ENGINE│ │
│  │              │  │              │  │              │  │        │ │
│  │ • Register   │  │ • Browse     │  │ • Tutorials  │  │ • XP   │ │
│  │ • OTP verify │  │ • Launch     │  │ • Courses    │  │ • Level│ │
│  │ • Login      │  │ • Exploit    │  │ • Progress   │  │ • Rank │ │
│  │ • Reset pwd  │  │ • Submit     │  │ • Ratings    │  │ • Streak│ │
│  │ • Profile    │  │ • Stop/Reset │  │              │  │        │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    INFRASTRUCTURE LAYER                      │   │
│  │   PostgreSQL  |  Docker Engine  |  SMTP Email  |  JWT Auth  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.1 Identity & Access Domain

Manages the full user lifecycle from first visit to profile completion.

```
[Visit Landing] → [Enter Email] → [New User?]
                                      │
              ┌───────── Yes ─────────┤──────── No ─────────┐
              ▼                                              ▼
    [Enter Password]                             [Enter Password]
         ▼                                            ▼
    [OTP sent to email]                        [JWT issued → Dashboard]
         ▼
    [Enter 6-digit OTP]
         ▼
    [JWT issued → Onboarding]
         ▼
    [Set username, level, interests, goals]
         ▼
    [Welcome email sent → Dashboard]
```

**Password reset flow:**
```
[Forgot Password] → [Enter email] → [OTP sent] → [Verify OTP] → [New password] → [Login]
```

### 1.2 Challenge Execution Domain

Governs the full lifecycle of an interactive challenge session.

```
[Challenge Browser]
        ▼
[Select Challenge]
        ▼
[Challenge Type?]
    ├── web / terminal ──→ [POST /start] → [Docker container launched]
    │                              ▼               ▼
    │                    [Port allocated]   [URL returned to user]
    │                              ▼
    │                    [User exploits the running service]
    │                              ▼
    │                    [User finds the flag in the container]
    │
    └── description / downloadable ──→ [Read problem / download file]
                                               ▼
                                       [Solve offline / on paper]
                ┌──────────────────────────────┘
                ▼
        [POST /submit with flag string]
                ▼
        [Exact string match against DB]
                ▼
        ┌── Correct ──→ [Points + XP awarded → Rank recalculated]
        └── Wrong ────→ [Error — no penalty]
```

**Container lifecycle rules:**
- One active container per user at any time — starting a new challenge stops the previous one
- Containers auto-expire after 45 minutes of inactivity
- Users can manually stop or reset (stop + restart) at any time
- A background cleanup job runs every 5 minutes to reclaim expired ports

### 1.3 Learning Content Domain

```
[Materials Page]
    ├── Tutorials (standalone, categorized by level)
    │       ▼
    │   [Read content sections (JSONB)]
    │       ▼
    │   [Progress auto-tracked (per section)]
    │       ▼
    │   [Optional: Rate tutorial (1–5 stars + feedback)]
    │
    └── Courses (structured sequences of tutorials)
            ▼
        [Module-by-module progression]
            ▼
        [Course completion tracking]
```

### 1.4 Gamification Domain

```
[Any challenge completed or daily login]
        ▼
[Streak check triggered]
        ▼
[Points + XP credited]
        ▼
[Level recalculated]   [Global rank recalculated]
        ▼                          ▼
[Dashboard stats updated]   [Leaderboard updated]
```

---

## 2. Challenge Complexity Matrix

### 2.1 Point Value Reference

| Difficulty | Point Range | XP Earned | Typical Effort |
|------------|-------------|-----------|----------------|
| Easy       | 20–40 pts   | 20–40 XP  | < 30 minutes — single technique |
| Medium     | 40–65 pts   | 40–65 XP  | 30–90 minutes — chained steps |
| Hard       | 75–85 pts   | 75–85 XP  | 90+ minutes — deep exploitation |

> Points and XP are equal in value. Both are awarded on flag submission.

### 2.2 Challenge Complexity Matrix

| Category | Challenge | Difficulty | Points | Type | Technique |
|---|---|---|---|---|---|
| **Web Exploitation** | ref-xss | Easy | 20 | Docker/web | Reflected Cross-Site Scripting |
| | bookmarklet | Easy | 25 | Docker/web | Directory traversal via bookmarklet |
| | power-cookie | Easy | 30 | Docker/web | Cookie manipulation |
| | path-traversal | Medium | 40 | Docker/web | Path traversal (LFI) |
| | logfile-challenge | Medium | 40 | Docker/web | Log injection / log file read |
| | jwt | Medium | 50 | Docker/web | JWT algorithm confusion / tampering |
| | python-compiler | Medium | 50 | Docker/web | Server-side code execution |
| | hidden-pages | Medium | 55 | Docker/web | Directory enumeration |
| | ssti | Medium | 55 | Docker/web | Server-Side Template Injection |
| | ssrf | Medium | 60 | Docker/web | Server-Side Request Forgery |
| | git-challenge | Medium | 60 | Docker/web | Exposed .git repository |
| | secret-jwt | Hard | 75 | Docker/web | JWT secret cracking + privilege escalation |
| **Network Security** | dos-challenge | Medium | 45 | Docker/web | TCP connection flooding / DoS |
| **Privilege Escalation** | old_system | Hard | 75 | Docker/terminal | SUID / sudo misconfiguration |
| **Cryptography** | crypto-basics | Easy | 20 | Description | Classical cipher identification |
| | c1 | Easy | 20 | Description | Caesar / ROT cipher |
| | c2 | Easy | 20 | Description | Base encoding |
| | c5 | Easy | 20 | Description | Binary / hex encoding |
| | ref-xss | Easy | 20 | Description | Encoding awareness |
| | c3 | Easy | 40 | Description | Multi-step encoding |
| | c14 | Easy | 30 | Description | Hash identification |
| | SecretStrand | Easy | 40 | Description | DNA / bioinformatics encoding |
| | BabyRSA | Easy | 40 | Downloadable | RSA basics |
| | c3-1 | Medium | 55 | Description | Substitution cipher + analysis |
| | c6 | Medium | 55 | Description | Vigenère / polyalphabetic cipher |
| | c6-1 | Medium | 55 | Description | Frequency analysis |
| | c6-2 | Medium | 55 | Description | Combined encoding |
| | c13 | Medium | 55 | Downloadable | File-based crypto challenge |
| | c7 | Medium | 60 | Downloadable | Advanced encoding / asymmetric |
| | c10 | Medium | 65 | Description | AES / symmetric crypto |
| | c11 | Hard | 75 | Description | RSA attack (small exponent) |
| | Death_note | Hard | 85 | Downloadable | Multi-layer cryptanalysis |
| **Forensics** | layers of trust | Medium | 40 | Downloadable | Steganography / layer analysis |
| | last_call | Medium | 55 | Downloadable | Audio / file forensics |
| **OSINT** | Historic_Site | Easy | 35 | Downloadable | Image metadata / reverse search |
| | beautifulDate | Easy | 35 | Downloadable | OSINT date/event correlation |
| | Skating | Medium | 55 | Downloadable | Social media / public record OSINT |

### 2.3 Challenge Type Distribution

| Type | Count | Description |
|---|---|---|
| Docker/web | 13 | Live vulnerable web app in a container |
| Docker/terminal | 1 | Interactive terminal session in a container |
| Downloadable | 10 | File provided — solve offline, submit flag |
| Description | 12 | Text/math problem — no file or container needed |
| **Total** | **36** | |

### 2.4 Difficulty Distribution by Category

| Category | Easy | Medium | Hard | Total |
|---|---|---|---|---|
| Web Exploitation | 3 | 8 | 1 | 12 |
| Cryptography | 9 | 6 | 2 | 17 |
| Forensics | 0 | 2 | 0 | 2 |
| Network Security | 0 | 1 | 0 | 1 |
| OSINT | 2 | 1 | 0 | 3 |
| Privilege Escalation | 0 | 0 | 1 | 1 |
| **Total** | **14** | **18** | **4** | **36** |

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser, port 3000)                    │
│                                                                   │
│   React 19 + TypeScript + Vite                                   │
│   HashRouter SPA — auth state in App.tsx — Axios API client      │
│   Tailwind CSS (CDN) — Lucide icons — ThemeContext               │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTP/REST  (Bearer JWT)
┌─────────────────────────▼────────────────────────────────────────┐
│                    BACKEND API (port 3001)                        │
│                                                                   │
│   Express 4 + TypeScript (ES Modules, tsx in dev)                │
│                                                                   │
│   Middleware stack (in order):                                    │
│   Helmet → CORS → JSON parser → Input sanitizer →               │
│   Rate limiter → JWT auth (per route) → Route handler            │
│                                                                   │
│   Routes:                                                         │
│   /api/auth          /api/users      /api/challenges             │
│   /api/tutorials     /api/courses    /api/analytics              │
│   /health (no auth)                                              │
└──────────┬──────────────────────────────────┬────────────────────┘
           │                                  │
┌──────────▼──────────┐            ┌──────────▼──────────────────┐
│    PostgreSQL 14+   │            │      Docker Engine           │
│                     │            │                              │
│  users              │            │  Challenge containers         │
│  user_stats         │            │  • Image: cytutor/<id>       │
│  challenges         │            │  • Port: dynamic (10k-20k)   │
│  user_challenges    │            │  • RAM: 256MB limit          │
│  ports (pool)       │            │  • CPU: 0.5 core limit       │
│  otps               │            │  • Net: bridge (isolated)    │
│  tutorials          │            │  • Timeout: 45 minutes       │
│  courses            │            │                              │
│  tutorial_ratings   │            │  Managed by:                 │
│  user_*_progress    │            │  ChallengeManager.ts         │
│                     │            │  PortManager.ts              │
└─────────────────────┘            └──────────────────────────────┘
```

### 3.2 Authentication Flow

```
Browser                     Backend                       DB
   │                            │                          │
   │── POST /api/auth/login ────►│                          │
   │                            │── SELECT user by email ─►│
   │                            │◄─ password_hash ─────────│
   │                            │                          │
   │                            │  bcrypt.compare()        │
   │                            │  jwt.sign({ userId })    │
   │◄── { token, user } ────────│                          │
   │                            │                          │
   │  localStorage.set(token)   │                          │
   │                            │                          │
   │── GET /api/users/me ───────►│                          │
   │  (Authorization: Bearer)   │── middleware/auth.ts ───►│
   │                            │   jwt.verify() → userId  │
   │                            │── SELECT user + stats ──►│
   │◄── User object ────────────│                          │
```

**Token:** HS256 JWT, 7-day expiry, signed with `JWT_SECRET`. Stored in `localStorage` as `cytutor_token`. The `authenticate` middleware on the backend verifies this on every protected request and attaches `req.userId`.

### 3.3 Challenge Container Lifecycle

```
POST /api/challenges/:id/start
        ▼
  Verify challenge_type ∈ {web, terminal}
        ▼
  Stop any other running containers for this user
        ▼
  portManager.allocate()
  → SELECT port WHERE is_allocated = FALSE LIMIT 1 FOR UPDATE
  → UPDATE ports SET is_allocated = TRUE
        ▼
  docker run -d \
    --name user-{userId8}-{challengeId} \
    -p {allocatedPort}:{internalPort} \
    --memory="256m" --cpus="0.5" \
    cytutor/{challengeId}
        ▼
  INSERT / UPDATE user_challenges
  (status=running, container_id, instance_port)
        ▼
  Return { url: http://{HOST_IP}:{port} }
        ▼
  setTimeout(autoCleanup, 45 min)


POST /api/challenges/:id/stop  (or auto-expire)
        ▼
  docker stop {container_id}
  docker rm {container_id}
        ▼
  portManager.free(port)
  → UPDATE ports SET is_allocated = FALSE
        ▼
  UPDATE user_challenges SET status = stopped/expired
```

### 3.4 Data Model

```
users ──────────────────────────────────────────────────────┐
  id (UUID PK)                                              │
  email, password_hash, username                            │
  experience_level, interests[], bio, goals                 │
  is_email_verified, is_profile_complete                    │
  ▼                                                         │
user_stats (1:1)                                            │
  challenges_solved, total_points, global_rank              │
  day_streak, max_streak, previous_streak                   │
  streak_freezes, streak_claimed_today, streak_broken_at    │
  level, xp, activity_history (DATE[])                      │
  last_active_date                                          │
  ▼                                                         │
user_challenges (many per user)                             │
  challenge_id (FK → challenges.id TEXT)                    │
  status: available|running|stopped|completed|expired       │
  container_id, instance_port                               │
  last_started_at, completed_at                             │
                                                            │
users ──────────────────────────────────────────────────────┘
  ▼
otps (many per email)
  otp_code, otp_type: signup|forgot_password
  expires_at (10 min), is_used

challenges
  id (TEXT PK), title, category, difficulty
  points, flag, challenge_type
  hints[], file_attachments[]

ports (pool)
  port (INT PK, 10000–20000)
  is_allocated, allocated_to (FK users)
```

### 3.5 Security Layers

| Layer | Mechanism | Config |
|---|---|---|
| Password storage | bcrypt, 10 rounds | `auth.ts:16` |
| Auth tokens | JWT HS256, 7-day expiry | `config/index.ts` |
| Email verification | 6-digit OTP, 10-min TTL, one-time use | `otpService.ts` |
| Rate limiting (auth) | 5 requests / 15 min per IP | `rateLimiter.ts` |
| Rate limiting (API) | 100 requests / 15 min per IP | `rateLimiter.ts` |
| HTTP headers | Helmet.js (XSS, HSTS, CSP, no-sniff) | `security.ts` |
| Input validation | Zod schemas on all auth routes | `auth.ts` |
| SQL injection | pg parameterized queries only | all `query()` calls |
| Container isolation | Docker bridge network, no host access | `challengeManager.ts` |
| CORS | Dev: localhost only; Prod: `CORS_ORIGINS` env var | `config/index.ts` |

### 3.6 Background Jobs

| Job | Interval | Purpose |
|---|---|---|
| Challenge cleanup | Every 5 minutes | Stop containers older than 45 minutes |
| OTP cleanup | Every 10 minutes | Delete expired OTP rows from DB |
| Streak reset | Daily (cron) | Reset `streak_claimed_today = FALSE` for all users |

---

## 4. How to Use the System

### 4.1 First-Time User Journey

**Step 1 — Register**
1. Open the platform at `http://localhost:3000`
2. Click **Get Started** on the landing page
3. Enter your email address and a password (minimum 8 characters)
4. A 6-digit OTP will be sent to your email — enter it within 10 minutes

**Step 2 — Onboarding**
After OTP verification you are taken to the onboarding screen:
- Set a username (public, unique)
- Choose your experience level: Beginner / Intermediate / Advanced
- Select interests (Web, Crypto, Network Security, etc.)
- Write a short bio and goals

Completing onboarding triggers a welcome email and unlocks the full dashboard.

**Step 3 — Daily Streak**
- Visit the platform each day to maintain your streak
- A popup on the dashboard lets you claim your daily login bonus
- Missing a day uses one of your freeze tokens (you start with 1)
- If you have no freeze and miss a day, your streak resets — but you can restore it within 24 hours by spending 100 points

### 4.2 Using the Challenge Browser

1. Navigate to **Challenges** in the sidebar
2. Filter by category or difficulty using the filter bar
3. Click a challenge card to open the detail page
4. Read the description and available hints

**For Docker challenges (web / terminal):**
1. Click **Start Instance** — a container launches in seconds
2. A URL is shown (e.g., `http://192.168.x.x:12345`)
3. Open the URL in your browser or terminal
4. Explore and exploit the running service
5. Find the flag (format: `Cytutor{...}`)
6. Paste the flag into the submission box and click **Submit**
7. The container stops automatically after 45 minutes, or click **Stop** to end early

**For description challenges:**
1. Read the problem statement directly on the challenge page
2. Solve the cryptographic or logic puzzle
3. Submit the flag string in the submission box

**For downloadable challenges:**
1. Download the provided file (binary, pcap, image, etc.)
2. Analyse the file using appropriate tools
3. Extract the flag and submit it

### 4.3 Using the Learning Materials

1. Navigate to **Materials** in the sidebar
2. Choose **Tutorials** (standalone) or **Courses** (structured paths)
3. Tutorials are marked with estimated reading time and difficulty level
4. Your progress is saved automatically per section
5. After completing a tutorial you can leave a 1–5 star rating with optional feedback

### 4.4 Profile & Stats

- Navigate to **Profile** to update your username, bio, avatar, location, and timezone
- The **Dashboard** shows your XP, level, current streak, points, global rank, and a calendar heatmap of activity history
- The **Leaderboard** (visible from the dashboard) shows weekly and all-time rankings

---

## 5. How the System Evaluates

### 5.1 Flag Submission (Challenge Evaluation)

Flag evaluation is a **case-sensitive exact string match**:

```
User input: "Cytutor{bookmarklet_reads_files_2025}"
DB stored:  "Cytutor{bookmarklet_reads_files_2025}"
Result:     ✅ Correct — points + XP awarded
```

- There is **no partial credit** and **no penalty for wrong attempts**
- A challenge can only be completed once per user — duplicate correct submissions return an error
- Flag format used throughout the platform: `Cytutor{...}`

### 5.2 Points & XP Calculation

On a correct flag submission, both **Points** and **XP** are credited with the same value as the challenge's point value:

```
user_stats.total_points += challenge.points
user_stats.xp           += challenge.points
user_stats.challenges_solved += 1
```

Points and XP are separate counters but always increase together on challenge completion. Additionally, XP is earned through streak activity (see section 5.4).

### 5.3 Level Calculation

Level is derived directly from total XP:

```
level = floor(total_xp / 1000) + 1
```

| Level | XP Required | Total Challenges (approx.) |
|---|---|---|
| 1 | 0 | Starting level |
| 2 | 1,000 XP | ~18 Easy challenges |
| 3 | 2,000 XP | ~36 Easy challenges |
| 5 | 4,000 XP | Mix of Easy + Medium |
| 10 | 9,000 XP | Mostly Hard challenges required |

Level is recalculated and stored on every challenge completion.

### 5.4 Global Rank Calculation

Rank is recalculated after every successful flag submission:

```sql
global_rank = (
  SELECT COUNT(*) + 1
  FROM user_stats
  WHERE total_points > this_user.total_points
)
```

Rank 1 = highest total points. Ties go to the user who was already at that score.

### 5.5 Streak Evaluation

The streak system tracks **daily login activity**, not challenge completion.

| Scenario | Effect | XP Gain | Points Gain |
|---|---|---|---|
| First login ever | Streak = 1 | +10 XP | 0 |
| Login on consecutive day | Streak +1 | +50 XP | 0 |
| 3-day streak milestone | Streak +1 | +50 XP | +50 pts |
| 7-day streak milestone | Streak +1 | +150 XP | +100 pts |
| 30-day streak milestone | Streak +1 | +250 XP | +500 pts |
| Missed day (freeze available) | Streak unchanged, freeze -1 | 0 | 0 |
| Missed day (no freeze) | Streak reset to 1 | +10 XP | 0 |
| Same day (already claimed) | No change | 0 | 0 |

**Streak restore:**
- If a streak breaks, the previous streak value is saved
- Within 24 hours, spending **100 points** restores `previous_streak + 1`
- After 24 hours, the restore option expires permanently
- The transaction uses `SELECT FOR UPDATE` to prevent race conditions

### 5.6 Streak Freeze

- Users start with **1 freeze token**
- Freezes are consumed automatically when a day is missed (if available)
- Additional freezes can be purchased (feature surfaced through the dashboard's streak modal)
- Freezes prevent streak loss but do not award XP or points

### 5.7 Summary: Reward Table

| Action | Points | XP |
|---|---|---|
| Easy challenge (20–40 pts) | +20 to +40 | +20 to +40 |
| Medium challenge (40–65 pts) | +40 to +65 | +40 to +65 |
| Hard challenge (75–85 pts) | +75 to +85 | +75 to +85 |
| Daily login | 0 | +10 to +50 |
| 3-day streak | +50 | +50 |
| 7-day streak | +100 | +150 |
| 30-day streak | +500 | +250 |
| Streak restore | −100 | 0 |

---

**Document Version:** 1.0
**Date:** April 2026
**Authors:** Team #06 — CyTutor Development Team
