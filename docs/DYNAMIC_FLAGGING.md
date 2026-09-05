# Dynamic Flagging — Blueprint

Per-user unique flags for Docker-based challenges, so flags cannot be shared between students.

---

## Table of Contents

- [Overview](#overview)
- [Scope](#scope)
- [Architecture](#architecture)
- [Flag Format](#flag-format)
- [End-to-End Flow](#end-to-end-flow)
- [Database Change](#database-change)
- [New Files](#new-files)
- [Modified Files](#modified-files)
- [Dockerfile Updates](#dockerfile-updates)
- [Implementation Order](#implementation-order)

---

## Overview

Currently all users submit the same static flag stored in the `challenges` table (loaded from `challenges.json`). Dynamic flagging generates a **unique flag per user per challenge** at container start time, injects it into the Docker container via an environment variable, and stores it in the database so the submission route can validate it without any shared secret.

---

## Scope

| Challenge Type | Flagging Strategy | Reason |
|----------------|-------------------|--------|
| `web` | Dynamic | Has a running container — flag injected via `FLAG` env var |
| `terminal` | Dynamic | Same — SSH/shell container, flag written to `/flag.txt` |
| `description` | Static (unchanged) | No container; flag checked directly against `challenges.flag` |
| `downloadable` | Static (unchanged) | File-based; flag embedded in the challenge artifact |

---

## Architecture

```
startChallenge(userId, challengeId)
        │
        ├─ generateFlag(challengeId, userId)
        │       HMAC-SHA256(JWT_SECRET, userId:challengeId) → hex[:12]
        │       → "Cytutor{<challengeId>_<hash>}"
        │
        ├─ docker run -e FLAG="Cytutor{...}" ...
        │       container reads FLAG from env at runtime
        │
        └─ store flag in user_challenges.dynamic_flag


submitFlag(userId, challengeId, submittedFlag)
        │
        ├─ if type === 'web' or 'terminal'
        │       SELECT dynamic_flag FROM user_challenges
        │       compare submittedFlag === dynamic_flag
        │
        └─ if type === 'description' or 'downloadable'
                SELECT flag FROM challenges  (unchanged)
```

---

## Flag Format

```
Cytutor{<challenge-id>_<12-char-hex>}

Examples:
  Cytutor{bookmarklet_3f9a1c042d7e}
  Cytutor{ssti_a84bc201f390}
  Cytutor{old_system_7e2d09c41ab5}
```

Generated as:

```ts
const hash = createHmac('sha256', JWT_SECRET)
  .update(`${userId}:${challengeId}`)
  .digest('hex')
  .substring(0, 12);

return `Cytutor{${challengeId}_${hash}}`;
```

- Deterministic per (user, challenge) pair — same user always gets the same flag for a given challenge, so resetting the container doesn't change the flag
- No new env vars required — reuses the existing `JWT_SECRET`
- 12 hex chars = 48 bits of entropy — sufficient to prevent brute force

---

## End-to-End Flow

### Start Challenge

```
POST /challenges/:id/start
        │
        ▼
ChallengeManager.startChallenge(userId, challengeId)
        │
        ├─ 1. Verify challenge exists and is web/terminal type
        ├─ 2. Stop any other running containers for this user
        ├─ 3. Allocate port from ports table
        ├─ 4. generateFlag(challengeId, userId)  ◄── NEW
        ├─ 5. docker run -e FLAG="..." ...        ◄── NEW (-e flag added)
        ├─ 6. Upsert user_challenges row
        │       includes dynamic_flag column      ◄── NEW
        └─ 7. Return { url, port }
```

### Submit Flag

```
POST /challenges/:id/submit  { flag: "Cytutor{...}" }
        │
        ▼
routes/challenges.ts
        │
        ├─ Fetch challenge type from challenges table
        │
        ├─ if web / terminal:
        │       SELECT dynamic_flag FROM user_challenges
        │       WHERE user_id = $1 AND challenge_id = $2  ◄── NEW
        │       correctFlag = dynamic_flag
        │
        └─ if description / downloadable:
                SELECT flag FROM challenges               (unchanged)
                correctFlag = challenges.flag
        │
        ▼
compare(submittedFlag, correctFlag) → award XP / points
```

---

## Database Change

Add one nullable column to `user_challenges`. Follow the existing targeted-migration pattern (like `migrate:otp`).

### Migration script

**`server/src/db/migrate-dynamic-flag.ts`**

```ts
import { query } from './index.js';

async function run() {
  await query(`
    ALTER TABLE user_challenges
    ADD COLUMN IF NOT EXISTS dynamic_flag TEXT;
  `);
  console.log('✅ dynamic_flag column added to user_challenges');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
```

### Register in `server/package.json`

```json
"migrate:dynamic-flag": "tsx src/db/migrate-dynamic-flag.ts"
```

### Run once

```bash
cd server
npm run migrate:dynamic-flag
```

---

## New Files

### `server/src/utils/flagGenerator.ts`

```ts
import { createHmac } from 'crypto';

export function generateFlag(challengeId: string, userId: string): string {
  const secret = process.env.JWT_SECRET!;
  const hash = createHmac('sha256', secret)
    .update(`${userId}:${challengeId}`)
    .digest('hex')
    .substring(0, 12);
  return `Cytutor{${challengeId}_${hash}}`;
}
```

---

## Modified Files

### `server/src/orchestrator/challengeManager.ts`

**Import the generator:**
```ts
import { generateFlag } from '../utils/flagGenerator.js';
```

**In `startChallenge()` — before `docker run`:**
```ts
const flag = generateFlag(challengeId, userId);
```

**`docker run` command — add `-e FLAG`:**
```ts
// Before:
`docker run -d --name ${containerName} -p ${port}:${definition.internalPort} \
  --memory="256m" --cpus="0.5" ${definition.image}`

// After:
`docker run -d --name ${containerName} -p ${port}:${definition.internalPort} \
  --memory="256m" --cpus="0.5" -e FLAG="${flag}" ${definition.image}`
```

**Upsert — add `dynamic_flag`:**
```ts
// Before:
`INSERT INTO user_challenges (user_id, challenge_id, status, container_id, instance_port, last_started_at)
 VALUES ($1, $2, 'running', $3, $4, CURRENT_TIMESTAMP)
 ON CONFLICT (user_id, challenge_id)
 DO UPDATE SET status='running', container_id=$3, instance_port=$4, last_started_at=CURRENT_TIMESTAMP`,
[userId, challengeId, containerId, port]

// After:
`INSERT INTO user_challenges (user_id, challenge_id, status, container_id, instance_port, last_started_at, dynamic_flag)
 VALUES ($1, $2, 'running', $3, $4, CURRENT_TIMESTAMP, $5)
 ON CONFLICT (user_id, challenge_id)
 DO UPDATE SET status='running', container_id=$3, instance_port=$4, last_started_at=CURRENT_TIMESTAMP, dynamic_flag=$5`,
[userId, challengeId, containerId, port, flag]
```

---

### `server/src/routes/challenges.ts`

In the flag submission handler, replace the flag source for web/terminal types:

```ts
// Current (static flag for all types):
const result = await query('SELECT flag FROM challenges WHERE id = $1', [challengeId]);
const correctFlag = result.rows[0].flag;

// New:
const challengeRow = await query(
  'SELECT flag, challenge_type FROM challenges WHERE id = $1',
  [challengeId]
);
const { flag: staticFlag, challenge_type } = challengeRow.rows[0];

let correctFlag: string;

if (challenge_type === 'web' || challenge_type === 'terminal') {
  const uc = await query(
    'SELECT dynamic_flag FROM user_challenges WHERE user_id = $1 AND challenge_id = $2',
    [req.user.id, challengeId]
  );
  if (!uc.rows[0]?.dynamic_flag) {
    return res.status(400).json({ error: 'Start the challenge instance first' });
  }
  correctFlag = uc.rows[0].dynamic_flag;
} else {
  correctFlag = staticFlag;
}
```

---

## Dockerfile Updates

Each of the 14 Docker-based challenges must read the flag from the `FLAG` environment variable instead of hardcoding it. The container receives it via `-e FLAG="..."` at runtime.

### Python / Flask

```python
# app.py
import os
FLAG = os.environ.get('FLAG', 'Cytutor{flag_not_set}')
```

### Node.js / Express

```js
// app.js / server.js
const FLAG = process.env.FLAG || 'Cytutor{flag_not_set}';
```

### Shell entrypoint

```dockerfile
# Dockerfile entrypoint / CMD
ENTRYPOINT ["/bin/sh", "-c", "echo $FLAG > /flag.txt && <start-app-command>"]
```

### Challenges to update

| Challenge ID | Type | Language | Flag location |
|---|---|---|---|
| bookmarklet | web | Python/Flask | `app.py` env read |
| dos-challenge | web | Python/Node | `app.py` / `server.js` |
| hidden-pages | web | — | served as static content or env |
| path-traversal | web | Python/Flask | `app.py` env read |
| power-cookie | web | — | env or template |
| ssti | web | Python/Flask | `app.py` env read |
| logfile-challenge | web | Python/Flask | `app.py` env read |
| jwt | web | Node.js | `server.js` env read |
| ref-xss | web | Python/Flask | `app.py` env read |
| ssrf | web | Python/Flask | `app.py` env read |
| python-compiler | web | Python/Flask | `app.py` env read |
| git-challenge | web | Node.js | inject into repo file via entrypoint |
| secret-jwt | web | Node.js | `server.js` env read |
| old_system | terminal | Shell | `echo $FLAG > /flag.txt` in entrypoint |

After updating each Dockerfile/app, rebuild the image:

```bash
cd Challenges/<category>/<name>
docker build -t cytutor/<id> .
```

---

## Implementation Order

```
1. npm run migrate:dynamic-flag          ← schema change, safe to run first
2. Write flagGenerator.ts                ← pure utility, no side effects
3. Update challengeManager.ts            ← inject flag into docker run + store in DB
4. Update routes/challenges.ts           ← read dynamic_flag on submit
5. Update Dockerfiles (one by one)       ← update app code + rebuild image
6. Smoke test each rebuilt challenge:
     - start instance → copy flag from container env
     - submit correct flag → should pass
     - submit wrong flag → should fail
     - submit another user's flag → should fail
```

---

## Testing Checklist

- [ ] Correct flag (own) → accepted, points awarded
- [ ] Wrong flag → rejected
- [ ] Another user's flag for same challenge → rejected
- [ ] Submit before starting instance → returns 400 "Start instance first"
- [ ] Reset container → same flag still works (deterministic HMAC)
- [ ] `description` / `downloadable` challenges → still use static flag, unaffected
