# Power Cookie Challenge

## Overview
This is a minimal web application designed to demonstrate improper trust of client-controlled cookies. The application sets a browser cookie `isAdmin=0` on first visit and subsequently uses this value for authorization. Since the authorization decision is derived entirely from client-provided data, privilege escalation is trivial.

## Architecture
- Frontend served via Apache (official `php:8.2-apache` image)
- Backend logic implemented in simple PHP (`index.php`, `check.php`)
- Authorization based purely on a cookie value (`isAdmin`)

## Objective
Review the application’s behavior, observe the client-side authorization mechanism, and identify the security weakness where user-controlled state is used to grant admin privileges.

## Run Instructions
```bash
docker build -t powercookie .
docker run -p 8080:80 powercookie
```
Access the application at:

http://localhost:8080
