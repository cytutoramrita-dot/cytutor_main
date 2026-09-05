# CyTutor – Deployment-Ready System Design Document

## 1. System Overview

CyTutor consists of three major subsystems:

1. **Frontend** – React + TypeScript (Vite build) served as static assets
2. **Backend API** – Node.js + Express providing authentication, streak logic, challenge management, tutorials, and user progression
3. **Challenge Orchestration Layer** – Docker-based system that runs each challenge in an isolated container and exposes challenge instances to users

The system is designed to run on a single Ubuntu production server with a reverse proxy (Nginx/Caddy), Docker Engine, and PostgreSQL.

## 2. Production Architecture Design

### High-Level Layout

```
Ubuntu Server
│
├── Reverse Proxy (Nginx or Caddy)
│   ├── Serves frontend static build
│   ├── Routes /api requests to backend
│   └── Routes challenge ports (10000-20000)
│
├── Frontend (React build output)
│   └── Stored in /var/www/cytutor or equivalent
│
├── Backend (Node.js)
│   ├── Runs as service/Docker container
│   ├── Reads environment variables for config
│   └── Connects to PostgreSQL
│
├── PostgreSQL
│   ├── Stores users, streaks, challenges, submissions
│   └── Managed either natively or inside Docker
│
└── Challenge Orchestration System
    ├── Challenge registry (challenge-registry.json)
    ├── Container builder templates
    ├── Port allocator (10000-20000)
    ├── User-instance tracker
    └── Challenge lifecycle manager
```

## 3. Repository Structure

### Frontend – React + TypeScript
```
/
├── components/
│   ├── dashboard/          (Leaderboard, StatsOverview, StreakCard, etc.)
│   ├── ui/                 (Base UI elements)
│   ├── Layout.tsx
│   ├── ParticleBackground.tsx
│   ├── StreakModal.tsx
│   └── TerminalWindow.tsx
├── pages/
│   ├── tutorials/          (AuthTutorial, Bookmarklet, Hidden)
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── Challenges.tsx
│   ├── Landing.tsx
│   ├── Materials.tsx
│   ├── Onboarding.tsx
│   └── Profile.tsx
├── services/
│   ├── locationService.ts
│   └── mockStore.ts
├── App.tsx
├── index.tsx
├── types.ts
└── vite.config.ts
```

### Backend – Node.js + Express + PostgreSQL
```
server/
├── src/
│   ├── db/
│   │   ├── index.ts        # PostgreSQL connection pool
│   │   ├── schema.sql      # Database schema (tables, indexes)
│   │   ├── migrate.ts      # Migration runner
│   │   └── seed.ts         # Initial data seeder
│   ├── middleware/
│   │   └── auth.ts         # JWT authentication middleware
│   ├── orchestrator/
│   │   ├── challengeManager.ts      # Container lifecycle management
│   │   ├── portManager.ts           # Port allocation
│   │   ├── challenge-registry.json  # Challenge definitions
│   │   └── templates/               # Dockerfile templates
│   │       ├── web-challenge/
│   │       ├── crypto-challenge/
│   │       ├── network-challenge/
│   │       └── reverse-challenge/
│   ├── routes/
│   │   ├── auth.ts         # POST /register, /login
│   │   ├── users.ts        # GET/PUT /me, streak management
│   │   ├── challenges.ts   # Challenge CRUD + orchestration
│   │   └── tutorials.ts    # GET tutorials
│   └── index.ts            # Express app setup & server start
├── package.json
├── tsconfig.json
└── .env.example
```

## 4. Database Schema

### Core Tables

**users**
- id, email, password_hash
- full_name, username, avatar
- location, timezone
- experience_level, interests, bio, goals
- is_profile_complete

**user_stats**
- user_id (FK)
- challenges_solved, total_points, global_rank
- day_streak, max_streak, previous_streak
- last_active_date, streak_freezes
- level, xp, activity_history

**challenges**
- id, title, category, difficulty
- points, description, flag

**user_challenges** (Extended for Orchestration)
- user_id, challenge_id
- status (locked/available/completed/running/stopped/expired)
- completed_at
- **container_id** (Docker container ID)
- **instance_port** (Allocated port)
- **last_started_at** (For timeout tracking)

**tutorials**
- id, title, description
- level, category, route

## 5. Backend System Design

### 5.1 Environment Configuration

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cytutor
JWT_SECRET=your-secret-key-change-in-production
PORT=3001
NODE_ENV=production

# Challenge Orchestration
CHALLENGE_PORT_MIN=10000
CHALLENGE_PORT_MAX=20000
CHALLENGE_TIMEOUT_MINUTES=45
```

### 5.2 Build & Runtime Expectation

- Backend compiled via TypeScript → JavaScript output
- Runs as a single Node.js process or in a Docker container
- Expects PostgreSQL to be reachable at configured URL
- Uses reverse proxy for HTTPS termination
- Serves no frontend assets (API only)

### 5.3 API Responsibilities

- Authentication and user management
- Streak logic and freeze/restore mechanics
- Challenge listing, submission, start/stop endpoints
- Tutorial metadata retrieval
- XP, level, leaderboard calculations
- **Container orchestration** (start/stop/reset challenges)

## 6. Frontend System Design

### 6.1 Build Behavior

Vite bundle produces optimized `dist/` folder containing:
- HTML entrypoint
- CSS assets
- JS bundles
- Static assets (SVG, PNG, JSON)

### 6.2 Hosting Expectations

- Frontend served as static files by reverse proxy
- All `/api/*` requests proxied to backend server
- SPA routing falls back to `index.html`

## 7. Challenge Orchestration System (Docker-Based)

### 7.1 Purpose

Enable each challenge to run in its own isolated Docker container:
- Independent runtime
- Sandbox environment
- Unique instance per user
- Dynamically allocated access port
- Start/stop/reset programmatically
- Prevent users from accessing internal server environment

### 7.2 Architecture Components

**Port Manager** (`portManager.ts`)
- Allocates free ports from range (10000-20000)
- Tracks allocated ports in memory
- Initializes from database on startup
- Frees ports when containers stop

**Challenge Manager** (`challengeManager.ts`)
- Starts Docker containers with user-specific names
- Maps host ports to container internal ports
- Tracks container IDs and ports in database
- Implements auto-cleanup after timeout
- Handles stop/reset operations
- Cleans up expired challenges periodically

**Challenge Registry** (`challenge-registry.json`)
- Static metadata for all challenges
- Defines Docker image, internal port, description
- Used for validation and container startup

### 7.3 Challenge Container Lifecycle

#### Start
1. Backend assigns free port from allowed range
2. Starts container named: `user-<userId>-<challengeId>`
3. Maps: `hostPort → container.internalPort`
4. Saves container ID + port to `user_challenges` table
5. Returns external URL to frontend
6. Sets auto-cleanup timer

#### Stop
1. Backend stops container by name
2. Removes container
3. Clears instance metadata
4. Frees allocated port

#### Reset
1. Stop → start cycle using same challenge ID

#### Auto Timeout
- Challenges expire after configurable idle time (default: 45 minutes)
- Background job checks container age every 5 minutes
- Stops and cleans up expired instances
- Updates status to 'expired'

## 8. API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `POST /api/users/streak/check` - Check and update daily streak
- `POST /api/users/streak/restore` - Restore broken streak (costs 100 points)

### Challenges
- `GET /api/challenges` - Get all challenges with user progress
- `POST /api/challenges/:id/start` - Start challenge container
- `POST /api/challenges/:id/stop` - Stop challenge container
- `POST /api/challenges/:id/reset` - Reset challenge container
- `GET /api/challenges/:id/status` - Get challenge instance status
- `POST /api/challenges/:id/submit` - Submit challenge flag

### Tutorials
- `GET /api/tutorials` - Get all tutorials

## 9. Reverse Proxy Routing Model

Reverse proxy maps:
- `/` → frontend static files
- `/api/` → backend:3001
- `10000-20000` → challenge container instances

Challenge ports must be explicitly whitelisted for security.

### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name cytutor.example.com;

    # Frontend
    location / {
        root /var/www/cytutor;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Challenge instances (port range)
    location ~ ^/challenge/(\d+)$ {
        set $challenge_port $1;
        proxy_pass http://localhost:$challenge_port;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## 10. Security Considerations

- Each instance runs in isolated Docker environment
- No shared host filesystem access
- Memory limited to 256MB per container
- CPU limited to 0.5 cores per container
- Rate-limited start/stop requests
- Hard cleanup on user logout or after TTL
- Non-overlapping port allocation
- Automatic shutdown for abuse prevention
- Containers run as non-root user
- JWT-based authentication for all API calls

## 11. Challenge Template Structure

### Web Challenge Example

```
templates/web-challenge/
├── Dockerfile
├── package.json
├── server.js
└── public/
    └── index.html
```

### Building Challenge Images

```bash
cd server/src/orchestrator/templates/web-challenge
docker build -t cytutor/web-01 .
```

## 12. Deployment Checklist

### Prerequisites
- Ubuntu 20.04+ server
- Docker Engine installed
- PostgreSQL 14+ installed
- Node.js 18+ installed
- Nginx or Caddy installed

### Backend Setup
1. Clone repository
2. `cd server && npm install`
3. Copy `.env.example` to `.env` and configure
4. Run `npm run migrate` to create tables
5. Run `npm run seed` to add initial data
6. Build challenge Docker images
7. Start backend: `npm run build && npm start`

### Frontend Setup
1. `npm install`
2. Update API endpoint in config
3. `npm run build`
4. Copy `dist/` to `/var/www/cytutor`

### Reverse Proxy Setup
1. Configure Nginx/Caddy with routing rules
2. Enable HTTPS with Let's Encrypt
3. Whitelist challenge port range

### Monitoring
1. Set up log rotation
2. Monitor Docker container count
3. Track port allocation
4. Monitor database connections
5. Set up alerts for failed containers

## 13. Deployment-Ready Summary

The system is now structured so that a developer can:

✓ Build frontend and serve as static content  
✓ Run backend as a service or Docker container  
✓ Connect backend to PostgreSQL  
✓ Add challenge definitions to the registry  
✓ Allow backend to auto-start challenge containers  
✓ Route traffic through a reverse proxy  
✓ Keep all challenge containers isolated and controlled  

The document provides everything needed to prepare CyTutor for production deployment on an Ubuntu server without actually performing deployment steps.
