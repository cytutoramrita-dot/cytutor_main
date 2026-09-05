# CyTutor: Interactive Cybersecurity Learning Platform
## Project Writeup Document

**Team #06**  
**Batch: 22UCYS**  
**Institution:** TIFAC-CORE in Cyber Security, Amrita School of Computing, Coimbatore  
**Project Duration:** January 2025 - November 2025

---

## Executive Summary

CyTutor is a modern, interactive cybersecurity learning platform designed to bridge the gap between theoretical knowledge and practical skills. The platform provides hands-on training through Docker-isolated challenges spanning multiple security domains including web exploitation, DOS attacks, privilege escalation, and cryptography. Built with a React/TypeScript frontend and Node.js/Express backend, CyTutor implements gamification elements (XP, streaks, achievements, leaderboards) to enhance student engagement and features robust security measures including JWT authentication, bcrypt password hashing, and OTP email verification.

---

## 1. Introduction

### 1.1 Problem Statement
Traditional cybersecurity education relies heavily on theory and outdated labs, leaving students unprepared for modern cyber threats. The workforce skills gap continues to widen due to lack of accessible, engaging, and up-to-date training materials.

### 1.2 Objectives
- Develop an accessible, self-hostable cybersecurity learning platform
- Provide hands-on experience through containerized challenges
- Implement gamification to increase engagement and retention
- Ensure platform security through industry best practices
- Support multiple cybersecurity domains and progressive difficulty

### 1.3 Scope
The project encompasses:
- Full-stack web application development
- Docker-based challenge orchestration
- User authentication and authorization system
- Progress tracking and analytics
- Email notification system
- Comprehensive documentation

---

## 2. System Architecture

### 2.1 Three-Tier Architecture
1. **Frontend Layer:** React 19 + TypeScript with Vite
2. **Backend Layer:** Node.js + Express + TypeScript
3. **Storage Layer:** PostgreSQL database

### 2.2 Key Components

#### Authentication Service
- JWT-based stateless authentication
- bcrypt password hashing (12 rounds)
- OTP email verification system
- Rate limiting (100 requests/15 minutes)

#### Challenge Orchestration
- Docker container lifecycle management
- Dynamic port allocation (10000-20000)
- Resource limits (256MB RAM, 0.5 CPU)
- Automatic cleanup after 45 minutes

#### Gamification Engine
- XP calculation and progression
- Daily streak tracking
- Achievement system
- Leaderboard rankings

#### Notification System
- Daily streak reminder emails
- Missed challenge notifications
- OTP delivery
- Achievement notifications

---

## 3. Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navigation
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Docker** - Containerization
- **Nodemailer** - Email service

### Security
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection
- **express-rate-limit** - Rate limiting

---

## 4. Implementation Details

### 4.1 Database Schema
- **users:** User accounts and credentials
- **otps:** OTP codes for email verification and password reset
- **user_stats:** Points, XP, levels, streaks, activity history (DATE[])
- **challenges:** Challenge metadata and flag definitions
- **user_challenges:** Per-user challenge status and running container info
- **ports:** Atomic port allocation pool for Docker containers (10000–20000)
- **tutorials / courses / course_modules:** Learning content with JSONB structured sections
- **user_tutorial_progress / user_course_progress:** Per-user learning progress
- **tutorial_ratings:** User ratings and feedback on tutorials

### 4.2 Challenge Domains
1. **Web Security** - SQL injection, XSS, authentication bypass
2. **DOS Attacks** - Rate limiting, resource exhaustion
3. **Privilege Escalation** - SUID, sudo misconfigurations
4. **Bookmarklet** - Browser-based vulnerabilities
5. **Cryptography** - Encoding, hashing, encryption

### 4.3 Security Features
- Password complexity requirements
- Email verification mandatory
- Session timeout (7 days via JWT expiry)
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- Security headers (CSP, X-Frame-Options)
- Container resource isolation

---

## 5. Key Features

### 5.1 User Features
- Multi-step registration with email OTP
- Password recovery system
- Personalized dashboard with statistics
- Challenge browser with filtering
- Real-time progress tracking
- Achievement showcase
- Leaderboard participation

### 5.2 Challenge Features
- Docker-isolated execution environments
- Unique port allocation per instance
- Automatic cleanup and timeout
- Hint system for guidance
- Tutorial content for learning
- Multiple difficulty levels

### 5.3 Gamification Features
- XP based on challenge difficulty
- Daily login streaks
- Achievement badges
- Global leaderboards
- Progress visualization
- Email notifications

---

## 6. Testing and Validation

### 6.1 Security Testing
- Authentication flow validation
- Password hashing verification
- JWT token expiration testing
- Rate limiting effectiveness
- Container isolation verification

### 6.2 Performance Testing
- Container startup time: 2-5 seconds
- Concurrent user capacity: 50+ simultaneous challenges
- Database query optimization
- API response times: <200ms average

### 6.3 User Testing
- Interface usability evaluation
- Challenge difficulty assessment
- Tutorial effectiveness review
- Feedback incorporation

---

## 7. Results and Outcomes

### 7.1 Technical Achievements
✅ Fully functional web application  
✅ 36 challenges (14 Docker-containerized, 22 description/downloadable)  
✅ Secure authentication system  
✅ Automated email notifications  
✅ Real-time progress tracking  
✅ Comprehensive documentation  

### 7.2 Learning Outcomes
- Mastery of full-stack web development
- Docker container orchestration
- Security best practices implementation
- Database design and optimization
- DevOps and deployment strategies

---

## 8. Challenges and Solutions

### Challenge 1: Container Management
**Problem:** Managing lifecycle of multiple concurrent containers  
**Solution:** Implemented automated cleanup, resource limits, and timeout mechanisms

### Challenge 2: Port Allocation
**Problem:** Dynamic port assignment without conflicts  
**Solution:** Port pool management system (10000-20000 range)

### Challenge 3: Email Deliverability
**Problem:** OTP emails marked as spam  
**Solution:** Proper SPF/DKIM configuration, rate limiting, professional templates

### Challenge 4: State Management
**Problem:** Complex frontend state across components  
**Solution:** Auth state centralized in `App.tsx` as a single `useState<User | null>`, passed down via props through `<Layout>`; `ThemeContext` handles theme preferences separately

---

## 9. Future Enhancements

### 9.1 Short-Term
- Additional challenge domains (mobile security, IoT)
- Team-based challenges and CTF events
- Enhanced analytics dashboard
- Mobile application

### 9.2 Long-Term
- AI-powered adaptive learning paths
- Automated challenge generation
- Integration with institutional LMS
- Professional certifications
- Instructor portal for content management

---

## 10. Conclusion

CyTutor successfully demonstrates a modern approach to cybersecurity education by combining containerized hands-on labs, gamification, and secure architecture. The platform addresses key limitations in traditional training methods while maintaining accessibility through self-hosting capabilities. The project contributes to UN SDG Goals 4 (Quality Education), 8 (Decent Work), 9 (Innovation), and 16 (Strong Institutions).

### Team Contributions
- **Asrita NL:** Frontend development, UI/UX design
- **Chinni Nagasree Hansica:** Backend API, authentication system
- **Sai Tejas M:** Docker orchestration, challenge development
- **Tangella Sree Chandan:** Database design, notification system

---

## References

See `Literature_Survey.md` for comprehensive references.

---

**Document Version:** 1.0  
**Date:** December 8, 2025  
**Status:** Completed
