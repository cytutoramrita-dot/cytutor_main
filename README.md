# CyTutor

> **A modern cybersecurity learning platform featuring Docker-isolated challenges, gamified progression, and hands-on vulnerability exploitation.**

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Required-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Deployment](#-deployment)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Security](#-security)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

CyTutor is a full-stack cybersecurity training platform designed for hands-on learning through practice. It provides isolated Docker-based challenge environments, allowing users to safely exploit vulnerabilities and learn real-world security concepts in a controlled sandbox.

### Why CyTutor?

- **🔒 Real-World Practice**: Exploit actual vulnerabilities in isolated Docker containers
- **🎮 Gamified Learning**: Streaks, XP levels, leaderboards, and achievements
- **🛡️ Enterprise Security**: JWT auth, OTP verification, rate limiting, and containerized isolation
- **⚡ Modern Stack**: React 19, TypeScript, Express, PostgreSQL, Docker orchestration
- **� Production-Ready**: Comprehensive deployment guides and security best practices

---

## ✨ Features

### 🔐 Authentication & Security

- **Multi-Step Email Verification**
  - 6-digit OTP codes with 10-minute expiration
  - Password-only login for verified users
  - Forgot password flow with secure reset
  - Automatic cleanup of expired codes
  - **Branded welcome email** sent after successful registration
  
- **Enterprise-Grade Security**
  - bcrypt password hashing with automatic salting
  - JWT tokens with 7-day expiration
  - Rate limiting (5 attempts per 15 minutes)
  - Helmet.js security headers
  - CORS protection

### 🎯 Challenge System

- **Docker-Isolated Environments**
  - Each challenge runs in a dedicated container
  - Dynamic port allocation (10000-20000 range)
  - Resource limits: 256MB RAM, 0.5 CPU per container
  - Auto-cleanup after 45-minute timeout
  - Challenge states: `locked`, `available`, `running`, `stopped`, `completed`, `expired`

- **Challenge Categories**
  - Web Security (SQL injection, XSS, CSRF, SSTI)
  - Privilege Escalation
  - Network Security & DoS
  - Path Traversal & Directory Exploitation
  - JWT & Cookie Manipulation

### 🎮 Gamification & Progression

- **Streak System**
  - Daily activity tracking with visual calendar
  - Streak freeze mechanic (purchasable with points)
  - Streak repair option (costs 100 points)
  - Milestone rewards every 7 days

- **Points & Leveling**
  - Challenge completion rewards (100-400 points)
  - XP-based level progression
  - Global ranking system
  - Activity history visualization

- **Social Features**
  - Weekly and all-time leaderboards
  - Public user profiles with stats
  - Activity feed and challenge history

### 📚 Learning Resources

- Comprehensive tutorials (beginner to advanced)
- Category-based organization
- Step-by-step vulnerability explanations
- Practical code examples and attack demonstrations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Port 3000)                        │
│   React 19 + TypeScript + Vite + Tailwind CSS              │
│   • React Router v7 for SPA navigation                      │
│   • Axios for API communication                             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────┴────────────────────────────────────────┐
│                  Backend API (Port 3001)                     │
│   Express + TypeScript + PostgreSQL                         │
│   • JWT Authentication Middleware                            │
│   • Rate Limiting & Security Headers                         │
│   • Challenge Orchestration Layer                            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
┌───────┴────────┐      ┌──────────┴──────────┐
│  PostgreSQL    │      │  Docker Engine       │
│  • Users       │      │  Challenge Containers│
│  • Challenges  │      │  • Dynamic Ports     │
│  • Stats       │      │  • Resource Limits   │
│  • OTPs        │      │  • Auto-Cleanup      │
└────────────────┘      └─────────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 19.2.0 with TypeScript 5.8
- **Build Tool**: Vite 6.2.0
- **Routing**: React Router DOM 7.9.6
- **HTTP Client**: Axios 1.13.2
- **Icons**: Lucide React 0.554.0
- **Styling**: Tailwind CSS (CDN)

#### Backend
- **Runtime**: Node.js 18+ (ES Modules)
- **Framework**: Express 4.18
- **Language**: TypeScript 5.3
- **Database**: PostgreSQL 14+ with native `pg` driver 8.11.3
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcrypt 5.1.1
- **Security**: Helmet 8.1, CORS 2.8.5, express-rate-limit 8.2.1
- **Email**: Nodemailer 6.9.16
- **Validation**: Zod 4.1.13

#### Infrastructure
- **Containerization**: Docker (challenge orchestration)
- **Database**: PostgreSQL with UUID primary keys
- **Port Management**: Dynamic allocation pool (10000-20000)

---

## � Prerequisites

| Dependency | Version | Installation |
|------------|---------|--------------|
| **Node.js** | 18.0.0+ | [Download](https://nodejs.org/) |
| **PostgreSQL** | 14.0+ | [Download](https://www.postgresql.org/download/) |
| **Docker** | Latest | [Get Docker](https://docs.docker.com/get-docker/) |
| **npm** | 9.0.0+ | Included with Node.js |

### System Requirements

- **OS**: Linux, macOS, or Windows (WSL2 recommended for Windows)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 10GB free space
- **Network**: Ports 3000, 3001, and 10000-20000 available

---

## 🚀 Quick Start

### 1️⃣ Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd cytutor

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2️⃣ Configure Environment

#### Frontend (`.env` in project root)

```env
VITE_API_URL=http://localhost:3001
```

#### Backend (`server/.env`)

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/cytutor

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=3001
NODE_ENV=development

# Challenge Orchestration
CHALLENGE_PORT_MIN=10000
CHALLENGE_PORT_MAX=20000
CHALLENGE_TIMEOUT_MINUTES=45

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Email Service (Optional - for OTP delivery)
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

> **💡 Outlook Setup**: Use your regular Outlook/Office365 credentials. For 2FA accounts, you may need an app password.

### 3️⃣ Initialize Database

```bash
cd server

# Create database (if not exists)
npx tsx create_db.ts

# Run migrations to create tables
npm run migrate

# Load challenge definitions
npm run load-challenges

# (Optional) Seed with sample data
npm run seed
```

### 4️⃣ Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Server running at http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Application running at http://localhost:3000
```

### 5️⃣ Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

---

## 💻 Development

### Available Scripts

#### Frontend (`package.json`)

```bash
npm run dev       # Start Vite dev server (port 3000)
npm run build     # Build for production
npm run preview   # Preview production build
```

#### Backend (`server/package.json`)

```bash
npm run dev              # Start development server with hot reload
npm run build            # Compile TypeScript to JavaScript
npm start                # Run production build
npm run migrate          # Run database migrations
npm run seed             # Seed database with sample data
npm run load-challenges  # Load challenge definitions from JSON
```

### Development Workflow

#### 🆕 Create a New Challenge

1. Add definition to `challenges.json` in the project root:
   ```json
   {
     "id": "my-challenge",
     "title": "My Challenge",
     "category": "Web Exploitation",
     "difficulty": "Medium",
     "points": 250,
     "description": "Challenge description",
     "flag": "Cytutor{your_flag_here}",
     "docker": {
       "image": "cytutor/my-challenge",
       "port": 5000
     }
   }
   ```

2. Create challenge files in `Challenges/my-challenge/` directory

3. Build Docker image:
   ```bash
   cd Challenges/my-challenge
   docker build -t cytutor/my-challenge .
   ```

4. Load challenges into database:
   ```bash
   cd server
   npm run load-challenges
   ```

#### 🗄️ Database Changes

1. Modify `server/src/db/schema.sql`
2. Create migration script in `server/src/db/`
3. Update TypeScript interfaces in `types.ts`
4. Run migration: `npm run migrate`

#### 🔌 Add API Endpoint

1. Add route in `server/src/routes/`
2. Register in `server/src/index.ts`
3. Add corresponding service call in `services/api.ts`

---

## 📁 Project Structure

```
cytutor/
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   │   └── Card.tsx
│   ├── dashboard/           # Dashboard-specific components
│   │   ├── StatsOverview.tsx
│   │   ├── StreakCard.tsx
│   │   ├── TrainingDomains.tsx
│   │   └── ActivityLeaderboard.tsx
│   ├── Layout.tsx           # Main layout wrapper
│   ├── ParticleBackground.tsx
│   ├── StreakModal.tsx
│   └── TerminalWindow.tsx
│
├── pages/                   # Application pages
│   ├── tutorials/           # Tutorial components
│   ├── Landing.tsx          # Public landing page
│   ├── Auth.tsx             # Login/signup/reset flows
│   ├── Dashboard.tsx        # User homepage
│   ├── Challenges.tsx       # Challenge browser
│   ├── Materials.tsx        # Learning materials
│   ├── Profile.tsx          # User profile editor
│   └── Onboarding.tsx       # New user onboarding
│
├── services/                # API clients
│   ├── api.ts               # Main API service
│   └── mockStore.ts         # Mock data for development
│
├── server/                  # Backend application
│   ├── src/
│   │   ├── db/              # Database layer
│   │   │   ├── schema.sql   # PostgreSQL schema
│   │   │   ├── migrate.ts   # Migration runner
│   │   │   ├── seed.ts      # Data seeding
│   │   │   └── load-challenges.ts
│   │   │
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.ts      # Authentication routes
│   │   │   ├── users.ts     # User management
│   │   │   ├── challenges.ts # Challenge CRUD
│   │   │   └── tutorials.ts
│   │   │
│   │   ├── middleware/      # Express middleware
│   │   │   └── auth.ts      # JWT verification
│   │   │
│   │   ├── orchestrator/    # Docker challenge manager
│   │   │   ├── challengeManager.ts
│   │   │   ├── portManager.ts
│   │   │   └── templates/   # Dockerfile templates
│   │   │
│   │   ├── services/        # Business logic
│   │   │   ├── emailService.ts
│   │   │   └── otpService.ts
│   │   │
│   │   ├── constants.ts     # Application constants
│   │   └── index.ts         # Server entry point
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── Challenges/              # Challenge source code
│   ├── bookmarklet/
│   ├── dos-challenge/
│   ├── hidden-pages/
│   ├── path-traversal/
│   ├── power-cookie/
│   └── ...
│
├── types.ts                 # Shared TypeScript types
├── App.tsx                  # React root component
├── index.tsx                # Frontend entry point
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
├── package.json             # Frontend dependencies
├── challenges.json          # Challenge definitions
├── .env                     # Frontend environment
├── README.md
├── AUTH_SETUP.md            # Authentication setup guide
└── DEPLOYMENT.md            # Production deployment guide
```

---

## 🔌 API Reference

### 🔐 Authentication Endpoints

<details>
<summary><b>POST</b> <code>/api/auth/register</code> - Register new user and send OTP</summary>

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to email"
}
```
</details>

<details>
<summary><b>POST</b> <code>/api/auth/verify-otp</code> - Verify OTP and complete registration</summary>

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```
</details>

<details>
<summary><b>POST</b> <code>/api/auth/login</code> - Login with email and password</summary>

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```
</details>

<details>
<summary><b>POST</b> <code>/api/auth/forgot-password</code> - Request password reset OTP</summary>

**Request Body:**
```json
{
  "email": "user@example.com"
}
```
</details>

<details>
<summary><b>POST</b> <code>/api/auth/reset-password</code> - Reset password with OTP</summary>

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newsecurepassword456"
}
```
</details>

### 👤 User Endpoints (Authenticated)

> **Note**: All user endpoints require `Authorization: Bearer <token>` header.

<details>
<summary><b>GET</b> <code>/api/users/me</code> - Get current user profile and stats</summary>

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "cyberwarrior",
  "stats": {
    "challengesSolved": 15,
    "totalPoints": 1250,
    "globalRank": 42,
    "dayStreak": 7,
    "maxStreak": 14,
    "level": 5,
    "xp": 3400
  }
}
```
</details>

<details>
<summary><b>PUT</b> <code>/api/users/me</code> - Update user profile</summary>

**Request Body:**
```json
{
  "username": "newusername",
  "bio": "Security enthusiast",
  "avatar": "https://example.com/avatar.jpg"
}
```
</details>

<details>
<summary><b>POST</b> <code>/api/users/streak/check</code> - Check and update daily streak</summary>

**Response:**
```json
{
  "status": "extended",
  "stats": { "dayStreak": 8, "xp": 3450 },
  "reward": { "xp": 50, "points": 10 }
}
```
</details>

<details>
<summary><b>POST</b> <code>/api/users/streak/restore</code> - Restore broken streak (costs 100 points)</summary>

**Response:**
```json
{
  "success": true,
  "stats": { "dayStreak": 5, "totalPoints": 950 }
}
```
</details>

### 🎯 Challenge Endpoints (Authenticated)

<details>
<summary><b>GET</b> <code>/api/challenges</code> - List all challenges with user progress</summary>

**Response:**
```json
{
  "challenges": [
    {
      "id": "bookmarklet",
      "title": "Bookmarklet",
      "category": "Web Exploitation",
      "difficulty": "Easy",
      "points": 100,
      "status": "available",
      "isCompleted": false
    }
  ]
}
```
</details>

<details>
<summary><b>POST</b> <code>/api/challenges/:id/start</code> - Start challenge Docker container</summary>

**Response:**
```json
{
  "success": true,
  "instanceUrl": "http://localhost:12345",
  "expiresAt": "2025-12-03T23:00:00Z"
}
```
</details>

<details>
<summary><b>POST</b> <code>/api/challenges/:id/stop</code> - Stop challenge container</summary>

**Response:**
```json
{
  "success": true,
  "message": "Challenge stopped successfully"
}
```
</details>

<details>
<summary><b>POST</b> <code>/api/challenges/:id/submit</code> - Submit flag for verification</summary>

**Request Body:**
```json
{
  "flag": "Cytutor{this_is_the_flag}"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Correct flag!",
  "reward": { "xp": 100, "points": 100 }
}
```
</details>

<details>
<summary><b>GET</b> <code>/api/challenges/:id/status</code> - Get challenge instance status</summary>

**Response:**
```json
{
  "status": "running",
  "instanceUrl": "http://localhost:12345",
  "expiresAt": "2025-12-03T23:00:00Z"
}
```
</details>

### 📚 Tutorial Endpoints

<details>
<summary><b>GET</b> <code>/api/tutorials</code> - Get all available tutorials</summary>

**Response:**
```json
{
  "tutorials": [
    {
      "id": "1",
      "title": "Introduction to Web Security",
      "level": "beginner",
      "category": "Web Exploitation"
    }
  ]
}
```
</details>

---

## 🛡️ Security

### Authentication & Authorization

- **Password Security**: bcrypt with automatic salt generation (10 rounds)
- **JWT Tokens**: 7-day expiration, HS256 algorithm, httpOnly cookies
- **OTP System**:
  - 6-digit codes (100000-999999 range)
  - 10-minute expiration
  - One-time use enforcement
  - Automatic cleanup of expired codes
- **Rate Limiting**: 5 attempts per 15 minutes per IP (authentication endpoints)

### API Protection

- **Helmet.js**: XSS protection, clickjacking prevention, MIME sniffing protection
- **CORS**: Configurable origins (restricted in production)
- **Input Validation**: Zod schema validation on all endpoints
- **SQL Injection**: Prepared statements via `pg` library

### Challenge Isolation

- **Container Sandboxing**: Each challenge runs in isolated Docker container
- **Resource Limits**:
  - Memory: 256MB per container
  - CPU: 0.5 cores per container
- **Network Isolation**: Containers have no host network access
- **Port Whitelisting**: Only allocated ports (10000-20000) are exposed
- **Automatic Cleanup**: Containers removed after 45-minute timeout

### Database Security

- **UUID Primary Keys**: Prevents enumeration attacks
- **SQL Indexes**: Optimized queries for user lookups
- **Foreign Keys**: ON DELETE CASCADE for data integrity
- **Parameterized Queries**: No string concatenation for SQL

---

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive production deployment guide including:

- Ubuntu server setup
- Nginx reverse proxy configuration
- SSL/TLS certificates (Let's Encrypt)
- Docker orchestration best practices
- Environment variable management
- Database backup strategies
- Monitoring and logging

### Quick Deploy with Docker Compose

```bash
# Set environment variables
export DB_PASSWORD=your_secure_password
export JWT_SECRET=$(openssl rand -hex 32)

# Start all services
docker-compose up -d

# Run migrations
docker exec cytutor-backend npm run migrate
docker exec cytutor-backend npm run load-challenges
```

---

## 🔧 Troubleshooting

### Common Issues

<details>
<summary><b>Issue 1:</b> Email Not Sending</summary>

**Symptoms**: OTP emails not arriving, email service connection errors

**Solutions**:
- Verify `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASS` in `server/.env`
- For Outlook/Office365: Use your regular credentials or app password if 2FA is enabled
- Check server logs for SMTP connection errors
- Ensure firewall allows outbound SMTP (port 587/465)
</details>

<details>
<summary><b>Issue 2:</b> Database Connection Failed</summary>

**Symptoms**: Backend crashes with `ECONNREFUSED` or `password authentication failed`

**Solutions**:
```bash
# Verify PostgreSQL is running
pg_isready

# Check if database exists
psql -U postgres -l | grep cytutor

# Test connection
psql -U postgres -d cytutor

# Verify DATABASE_URL in server/.env
# Format: postgresql://username:password@localhost:5432/cytutor
```
</details>

<details>
<summary><b>Issue 3:</b> Port Already in Use</summary>

**Symptoms**: `Error: listen EADDRINUSE: address already in use ::1:3001`

**Solutions**:
```bash
# Find process using port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/Mac

# Kill the process
kill -9 <PID>                 # Linux/Mac
taskkill /PID <PID> /F        # Windows
```
</details>

<details>
<summary><b>Issue 4:</b> Docker Container Issues</summary>

**Symptoms**: Challenges fail to start, container errors in logs

**Solutions**:
```bash
# Verify Docker is running
docker ps

# Check available ports
netstat -an | grep 10000

# View container logs
docker logs <container_id>

# Clean up orphaned containers
docker container prune -f

# Check port allocation in database
psql -d cytutor -c "SELECT * FROM ports WHERE is_allocated = true;"
```
</details>

<details>
<summary><b>Issue 5:</b> Frontend Cannot Connect to Backend</summary>

**Symptoms**: API calls return 404, CORS errors in browser console

**Solutions**:
- Verify `VITE_API_URL=http://localhost:3001` in `.env`
- Check backend is running: `curl http://localhost:3001/health`
- Verify CORS settings in `server/src/index.ts` allow `http://localhost:3000`
- Clear browser cache and hard refresh (Ctrl+Shift+R)
</details>

<details>
<summary><b>Issue 6:</b> Streak Modal Appears Every Time</summary>

**Symptoms**: Streak notification popup shows on every dashboard visit

**Solutions**:
- Clear browser localStorage: `localStorage.removeItem('streakModalLastShown')`
- This was a known bug, fixed in latest version
</details>

---

## 📚 Documentation

### 📖 Core Documentation
- **[Authentication Setup Guide](./AUTH_SETUP.md)** - Detailed email verification and OTP setup
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Notifications System](./NOTIFICATIONS.md)** - Email notification architecture and setup
- **[Changelog](./CHANGELOG.md)** - Project evolution and version history
- **[Contributing Guidelines](./CONTRIBUTING.md)** - How to contribute to the project
- **[API Reference](#-api-reference)** - Complete API documentation (this file)

### 📁 Project Documentation (`docs/`)
- **[Literature Survey](./docs/Literature_Survey.md)** - Comprehensive research and exploration report
- **[Project Writeup](./docs/Project_Writeup.md)** - Complete project documentation
- **[Final Report PDF](./docs/final-report.pdf)** - Complete project report
- **[Review PPTs Guide](./docs/Review_PPTs_Guide.md)** - Presentation guidelines and structure
- **[Screenshots Guide](./docs/images/README.md)** - Application screenshots documentation

### 💻 Technical Documentation
- **[Backend API](./server/README.md)** - Backend API documentation and endpoints
- **[Source Code Guide](./src/README.md)** - Frontend, backend, and challenge source code references

---

## 🤝 Contributing

This is a private educational project. For questions or issues:

1. Check [Troubleshooting](#-troubleshooting) section
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production issues
3. Check [AUTH_SETUP.md](./AUTH_SETUP.md) for authentication setup

---

## 📄 License

**Private Project** - All Rights Reserved

---

## 🙏 Acknowledgments

Built with modern web technologies:

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **Infrastructure**: Docker, Nginx
- **Security**: bcrypt, jsonwebtoken, Helmet.js
- **Email**: Nodemailer
- **Validation**: Zod

---

<div align="center">

**CyTutor** - *Master Cybersecurity Through Practice*

Made with ❤️ for security enthusiasts

</div>
