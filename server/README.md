# CyTutor Backend

PostgreSQL-backed REST API with Docker-based challenge orchestration for the CyTutor cybersecurity learning platform.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker Engine (for challenge orchestration)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up PostgreSQL database:
   ```bash
   createdb cytutor
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and challenge settings
   ```

4. Run migrations:
   ```bash
   npm run migrate
   ```

5. Seed initial data:
   ```bash
   npm run seed
   ```

6. Build challenge Docker images:
   ```bash
   cd src/orchestrator/templates/web-challenge
   docker build -t cytutor/web-01 .
   ```

7. Start development server:
   ```bash
   npm run dev
   ```

## API Endpoints

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
- `POST /api/challenges/:id/start` - Start challenge container instance
- `POST /api/challenges/:id/stop` - Stop challenge container
- `POST /api/challenges/:id/reset` - Reset challenge container
- `GET /api/challenges/:id/status` - Get challenge instance status
- `POST /api/challenges/:id/submit` - Submit challenge flag

### Tutorials
- `GET /api/tutorials` - Get all tutorials

## Challenge Orchestration

The backend includes a Docker-based challenge orchestration system that:

- Runs each challenge in an isolated container
- Allocates unique ports (10000-20000) per user instance
- Auto-cleans up containers after 45 minutes (configurable)
- Tracks container lifecycle in database
- Limits resources (256MB RAM, 0.5 CPU per container)

### Challenge Registry

Challenges are defined in `src/orchestrator/challenge-registry.json`:

```json
{
  "id": "web-01",
  "name": "Challenge Name",
  "image": "cytutor/web-01",
  "internalPort": 3000,
  "description": "Challenge description"
}
```

### Creating New Challenges

1. Copy a template from `src/orchestrator/templates/`
2. Modify challenge content
3. Build Docker image: `docker build -t cytutor/challenge-id .`
4. Add entry to `challenge-registry.json`

## Database Schema

- `users` - User accounts and profiles
- `user_stats` - User statistics and streaks
- `challenges` - Available challenges
- `user_challenges` - User progress + container orchestration data
- `tutorials` - Tutorial content

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cytutor
JWT_SECRET=your-secret-key
PORT=3001
CHALLENGE_PORT_MIN=10000
CHALLENGE_PORT_MAX=20000
CHALLENGE_TIMEOUT_MINUTES=45
```
