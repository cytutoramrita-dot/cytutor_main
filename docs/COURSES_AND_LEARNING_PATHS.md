# CyTutor — Courses & Learning Paths

An overview of all structured courses and recommended learning paths available on the CyTutor platform.

---

## Table of Contents

- [Courses Overview](#courses-overview)
  - [Cybersecurity Fundamentals](#1-cybersecurity-fundamentals)
  - [Linux Fundamentals](#2-linux-fundamentals)
  - [Computer Networks](#3-computer-networks)
- [Learning Paths](#learning-paths)
  - [Beginner Path — Start Here](#beginner-path--start-here)
  - [Web Security Path](#web-security-path)
  - [Advanced Web Exploitation Path](#advanced-web-exploitation-path)
  - [CTF Competitor Path](#ctf-competitor-path)
  - [Cryptography Path](#cryptography-path)
  - [OSINT Path](#osint-path)
  - [Digital Forensics Path](#digital-forensics-path)
  - [Systems & Network Security Path](#systems--network-security-path)
- [Challenge Categories](#challenge-categories)
- [Adding a New Course](#adding-a-new-course)

---

## Courses Overview

Courses are structured collections of tutorials with defined prerequisites and learning objectives. They are loaded into the database via `npm run load-courses` from `server/src/db/load-courses.ts`.

| Course | Level | Modules | Est. Time | Category |
|--------|-------|---------|-----------|----------|
| Cybersecurity Fundamentals | Beginner | 6 | ~235 min | Cybersecurity |
| Linux Fundamentals | Beginner | 7 | ~215 min | Operating Systems |
| Computer Networks | Intermediate | 8 | ~320 min | Networking |

---

## 1. Cybersecurity Fundamentals

> Aligned with CompTIA Security+ — covers security concepts, threats, cryptography, IAM, network defense, and incident response.

**Tags:** Security · CompTIA Security+ · Cryptography · IAM · Incident Response  
**Level:** Beginner | **Total Time:** ~235 min

### Learning Objectives
- Understand core security principles and the CIA triad
- Identify and defend against common threats and attacks
- Master cryptography and PKI concepts
- Implement identity and access management
- Design and secure network infrastructure
- Respond to security incidents effectively

### Modules

| # | Module | Est. Time | Prerequisites |
|---|--------|-----------|---------------|
| 1 | Introduction to Security | 30 min | — |
| 2 | Threats and Attacks | 45 min | Module 1 |
| 3 | Cryptography | 40 min | Module 2 |
| 4 | Identity and Access Management | 35 min | Module 3 |
| 5 | Network Security and Defense | 40 min | Module 4 |
| 6 | Incident Response and Security Operations | 45 min | Module 5 |

---

## 2. Linux Fundamentals

> Complete command-line and system administration series for cybersecurity professionals, covering file systems, permissions, processes, and networking.

**Tags:** Linux · Command Line · System Administration · Security  
**Level:** Beginner | **Total Time:** ~215 min

### Learning Objectives
- Master the Linux command line interface
- Understand file systems and permissions
- Learn process and service management
- Configure networking and security
- Develop system administration skills

### Modules

| # | Module | Est. Time | Prerequisites |
|---|--------|-----------|---------------|
| 1 | Introduction to Linux | 20 min | — |
| 2 | File System Structure | 25 min | Module 1 |
| 3 | Essential Commands | 35 min | Module 2 |
| 4 | Text Processing & Search | 30 min | Module 3 |
| 5 | Users, Groups & Permissions | 40 min | Module 4 |
| 6 | Processes & System Management | 35 min | Module 5 |
| 7 | Networking Fundamentals | 30 min | Module 6 |

---

## 3. Computer Networks

> Top-down approach to computer networking based on Kurose-Ross. Covers Internet architecture, all OSI layers, wireless networks, and security.

**Tags:** Networking · Internet · Protocols · TCP/IP · OSI Model  
**Level:** Intermediate | **Total Time:** ~320 min

### Learning Objectives
- Understand Internet architecture and protocols
- Master application layer protocols (HTTP, DNS, SMTP)
- Learn transport layer mechanisms (TCP, UDP)
- Understand network layer routing and addressing
- Master link layer and wireless technologies
- Learn network security fundamentals
- Develop practical networking skills

### Modules

| # | Module | Est. Time | Prerequisites |
|---|--------|-----------|---------------|
| 1 | Computer Networks and the Internet | 45 min | — |
| 2 | Application Layer | 50 min | Module 1 |
| 3 | Transport Layer | 45 min | Module 2 |
| 4 | Network Layer: Data Plane | 40 min | Module 3 |
| 5 | Network Layer: Control Plane | 35 min | Module 4 |
| 6 | Link Layer and LANs | 40 min | Module 5 |
| 7 | Wireless and Mobile Networks | 35 min | Module 6 |
| 8 | Network Security | 30 min | Module 7 |

---

## Learning Paths

Learning paths chain courses and challenges into a recommended progression for specific goals.

---

### Beginner Path — Start Here

For users with no prior cybersecurity experience.

```
Linux Fundamentals (Course)
        ↓
Cybersecurity Fundamentals (Course)
        ↓
Crypto Basics (Challenge — Easy)
        ↓
Caesar Salad / ROT? (Challenge — Easy)
        ↓
Reflected XSS (Challenge — Easy)
        ↓
Power Cookie (Challenge — Easy)
        ↓
Bookmarklet (Challenge — Easy)
```

**Goal:** Build foundational OS and security literacy before attempting interactive challenges.

---

### Web Security Path

For learners focused on web application exploitation.

```
Linux Fundamentals (Course)          ← command-line prerequisites
        ↓
Cybersecurity Fundamentals (Course)  ← HTTP, auth, crypto background
        ↓
─── Challenges (Easy) ───
Reflected XSS · Power Cookie · Bookmarklet
        ↓
─── Challenges (Medium) ───
Hidden Pages · Path Traversal · Logfile · SSTI · JWT Forgery · SSRF · Python Compiler · StreamFlix (Git)
        ↓
─── Challenges (Hard) ───
Secret (JWT weak key cracking)
```

**Skills covered:** XSS, cookie manipulation, path traversal, SSTI, JWT attacks, SSRF, log leakage, Git exposure.

---

### Advanced Web Exploitation Path

A follow-on path for learners who have already completed the Web Security Path's Easy tier. Skips the course prerequisites and Easy challenges, and sequences the remaining Medium/Hard web challenges by attack technique rather than difficulty alone.

```
Web Security Path — Easy tier (prerequisite, not repeated here)
Reflected XSS · Power Cookie · Bookmarklet
        ↓
─── Server-Side Logic Abuse ──────────────────────────────────────
SSTI (Medium) — server-side template injection, internal object access
        ↓
Python Compiler (Medium) — sandbox escape via indirect code execution
        ↓
─── Access & Trust Boundary Attacks ──────────────────────────────
JWT Forgery (Medium) — claim tampering, algorithm confusion
        ↓
SSRF (Medium) — internal service access via server-side requests
        ↓
─── Reconnaissance & Information Disclosure ──────────────────────
Hidden Pages (Medium) — directory/source reconnaissance
        ↓
Path Traversal (Medium) — double URL-encoding filter bypass
        ↓
Logfile (Medium) — sensitive data leaked via a logging endpoint
        ↓
StreamFlix (Medium) — exposed .git directory, commit history recovery
        ↓
─── Capstone ──────────────────────────────────────────────────────
Secret (Hard) — weak JWT secret cracking + admin token forgery
```

**Prerequisites:** Web Security Path's Easy tier (Reflected XSS, Power Cookie, Bookmarklet) — this path assumes that baseline and does not repeat course modules.

**Skills covered:** SSTI, sandbox escape, JWT algorithm/claim attacks, SSRF, directory/source reconnaissance, encoded path traversal, log-based data leakage, Git history recovery, JWT secret cracking.

---

### CTF Competitor Path

Broad coverage across all challenge categories to prepare for CTF competitions.

```
Linux Fundamentals (Course)
        ↓
Cybersecurity Fundamentals (Course)
        ↓
─── Web Exploitation ──────────────────────────────────────────
Easy:    Reflected XSS · Power Cookie · Bookmarklet
Medium:  Hidden Pages · Path Traversal · Logfile · SSTI
         JWT Forgery · SSRF · Python Compiler · StreamFlix
Hard:    Secret (JWT weak key)
        ↓
─── Cryptography ──────────────────────────────────────────────
Easy:    Crypto Basics (Base64) · Caesar Salad · ASCII Artifacts
         JSON Web Token · Hash Hunt · Baby RSA · Secret Strand
Medium:  Diffie-Hellman · Generators of a Group · RSA · Low Exponent
         Tiny RSA · AES-ECB Weak Key · Shamir's Secret Sharing
         Knapsack Mystery
Hard:    Signed or Not? · Death Note
        ↓
─── Forensics ─────────────────────────────────────────────────
Medium:  Last_call · Layers_of_trust
        ↓
─── OSINT ─────────────────────────────────────────────────────
Easy:    Historic Site · Beautiful Date
Medium:  Skating
        ↓
─── Network Security ──────────────────────────────────────────
Medium:  DoS Challenge
        ↓
─── Privilege Escalation ──────────────────────────────────────
Hard:    Old System
```

---

### Cryptography Path

Deep focus on cryptographic concepts, from encoding to advanced RSA/DH attacks.

```
Cybersecurity Fundamentals → Cryptography module (Course)
        ↓
─── Encoding & Classic Ciphers ────────────────────────────────
Crypto Basics (Base64) → Caesar Salad → ASCII Artifacts → JSON Web Token
        ↓
─── Hashing ───────────────────────────────────────────────────
Hash Hunt
        ↓
─── Asymmetric Cryptography ───────────────────────────────────
Diffie-Hellman → Generators of a Group
RSA → Low Exponent → Tiny RSA → Baby RSA
        ↓
─── Symmetric Cryptography ────────────────────────────────────
AES-ECB Weak Key
        ↓
─── Advanced / Hard ───────────────────────────────────────────
Knapsack Mystery → Shamir's Secret Sharing → Signed or Not? → Death Note
```

**Skills covered:** Base64, Caesar/ROT, ASCII, JWT decoding, SHA-256 brute force, modular inverse, primitive roots, RSA decryption, low-exponent attack, small-modulus factoring, AES-ECB dictionary attack, Lagrange interpolation, ECDSA verification, AES-GCM, partial key leakage (Death Note).

---

### OSINT Path

For learners interested in open-source intelligence and geolocation.

```
─── Easy ──────────────────────────────────────────────────────
Historic Site · Beautiful Date
        ↓
─── Medium ────────────────────────────────────────────────────
Skating
```

**Skills covered:** Reverse image search, geolocation, landmark identification, stadium/venue recognition.

---

### Digital Forensics Path

For learners focused on evidence analysis, steganography, and hidden-data recovery.

```
Cybersecurity Fundamentals → Cryptography module (Course)
        ↓
─── Audio & Signal Forensics ──────────────────────────────────
Last_call (Medium) — DTMF tone decoding, stereo channel separation, XOR recovery
        ↓
─── Email, Metadata & Steganography ────────────────────────────
Layers_of_trust (Medium) — MIME structure, PGP, Argon2 KDF, PNG steganography
```

**Skills covered:** DTMF tone decoding, audio channel/XOR analysis, MIME/email structure inspection, PGP encryption, Argon2 key derivation, PNG steganography, metadata correlation.

---

### Systems & Network Security Path

For learners focused on infrastructure-level attacks — from network protocol abuse to privilege escalation on live systems.

```
Linux Fundamentals (Course)              ← shell, permissions, processes
        ↓
Computer Networks → Network Security module (Course)
        ↓
─── Network-Layer Attacks ──────────────────────────────────────
DoS Challenge (Medium) — concurrent TCP connection exhaustion
        ↓
─── Host-Level Exploitation ─────────────────────────────────────
Old System (Hard) — sudo misconfiguration & outdated binary exploitation
```

**Skills covered:** TCP connection exhaustion (slowloris-style DoS), SSH-based terminal exploitation, sudo permission auditing, outdated privileged binary exploitation.

---

## Challenge Categories

| Category | Count | Difficulties |
|----------|-------|-------------|
| Web Exploitation | 12 | Easy (3) · Medium (7) · Hard (2) |
| Cryptography | 15 | Easy (7) · Medium (6) · Hard (2) |
| Forensics | 2 | Medium (2) |
| OSINT | 3 | Easy (2) · Medium (1) |
| Network Security | 1 | Medium (1) |
| Privilege Escalation | 1 | Hard (1) |
| **Total** | **34** | |

### Points by Difficulty

| Difficulty | Points Range |
|------------|-------------|
| Easy | 20 – 40 pts |
| Medium | 40 – 65 pts |
| Hard | 75 – 85 pts |

---

## Adding a New Course

1. Open `server/src/db/load-courses.ts` and add an entry to the `courses` array following the existing schema:
   ```ts
   {
     id: "your-course-id",
     title: "Your Course Title",
     description: "...",
     category: "Cybersecurity | Networking | Operating Systems | Programming",
     level: "beginner | intermediate | advanced",
     total_modules: N,
     total_time: N,   // minutes
     icon: "Shield | Terminal | Network | ...",
     color: "neon-purple | neon-green | neon-blue | ...",
     tags: ["Tag1", "Tag2"],
     learning_objectives: ["Objective 1", "..."],
     modules: [ /* CourseModule[] — each maps to a tutorial id */ ]
   }
   ```
2. Add corresponding tutorial entries to `tutorials.json`.
3. Run `npm run load-courses` from `server/` to push to the database.
4. Update this document with the new course and any learning path changes.
