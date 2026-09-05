# Authentication Setup Guide

## Overview

CyTutor now implements a secure, multi-step authentication flow:

- **Signup**: Email + Password + OTP verification
- **Login**: Password only (fast login)
- **Forgot Password**: OTP-based password reset

## Authentication Flow

### 1. User Registration (Signup)

```
User enters email + password
    ↓
Backend validates and sends OTP via email
    ↓
User enters 6-digit OTP
    ↓
Backend verifies OTP and creates account
    ↓
User is logged in with JWT token
```

**API Endpoints:**
- `POST /api/auth/register` - Send OTP
- `POST /api/auth/verify-otp` - Verify and complete registration

### 2. User Login

```
User enters email
    ↓
User enters password
    ↓
Backend validates credentials
    ↓
User is logged in with JWT token
```

**API Endpoint:**
- `POST /api/auth/login` - Login with password

### 3. Forgot Password

```
User enters email
    ↓
Backend sends OTP via email
    ↓
User enters 6-digit OTP
    ↓
User sets new password
    ↓
Password is reset
```

**API Endpoints:**
- `POST /api/auth/forgot-password` - Send reset OTP
- `POST /api/auth/reset-password` - Reset password with OTP

## Setup Instructions

### 1. Database Migration

If you have an existing database, run the OTP migration:

```bash
cd server
npm run migrate:otp
```

For new installations, the main migration includes OTP support:

```bash
cd server
npm run migrate
```

### 2. Email Service Configuration

Configure your email service in `server/.env`:

```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

**For Outlook/Office365:**
1. Use your regular Outlook/Office365 credentials
2. If using 2FA, you may need an app password
3. For organizational accounts, contact your IT admin
3. Use the generated password in `EMAIL_PASS`

**For Other Services:**
- Set `EMAIL_SERVICE` to your provider (e.g., 'outlook', 'yahoo')
- Or use custom SMTP settings in `server/src/services/email.ts`

### 3. Frontend Configuration

Create `.env` in the root directory:

```env
VITE_API_URL=http://localhost:3001
```

For production, update to your production API URL.

### 4. Start the Application

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
npm run dev
```

## Security Features

### OTP Security
- 6-digit random codes
- 10-minute expiration
- One-time use only
- Automatic cleanup of expired OTPs

### Password Security
- Minimum 8 characters
- Bcrypt hashing with salt rounds
- No password stored in plain text

### Rate Limiting
- 5 attempts per 15 minutes per IP
- Prevents brute force attacks

### Email Verification
- Users must verify email before login
- Prevents fake account creation

## Testing the Flow

### 1. Test Registration

```bash
# Step 1: Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Check your email for OTP

# Step 2: Verify OTP
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

### 2. Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Test Forgot Password

```bash
# Step 1: Request reset
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check your email for OTP

# Step 2: Reset password
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456","newPassword":"newpassword123"}'
```

## Troubleshooting

### Email Not Sending

1. Check email service configuration in `.env`
2. Verify app password is correct
3. Check server logs for email errors
4. Ensure firewall allows SMTP connections

### OTP Invalid or Expired

- OTPs expire after 10 minutes
- Each OTP can only be used once
- Request a new OTP if expired

### Email Not Verified Error

- Complete the OTP verification step during registration
- Check if email was marked as verified in database

## Database Schema

### Users Table
```sql
- is_email_verified BOOLEAN DEFAULT FALSE
```

### OTPs Table
```sql
- id UUID PRIMARY KEY
- email VARCHAR(255)
- otp_code VARCHAR(6)
- otp_type VARCHAR(20) -- 'signup' or 'forgot_password'
- expires_at TIMESTAMP
- is_used BOOLEAN
- created_at TIMESTAMP
```

## Production Considerations

1. **Use a dedicated email service** (SendGrid, AWS SES, Mailgun)
2. **Enable HTTPS** for all API calls
3. **Set secure CORS origins** in production
4. **Monitor OTP usage** for abuse
5. **Implement additional rate limiting** if needed
6. **Add email templates** for better UX
7. **Consider SMS OTP** as alternative

## Future Enhancements

- [ ] Resend OTP functionality
- [ ] SMS-based OTP
- [ ] Social login (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Email templates with branding
- [ ] Remember device functionality
- [ ] Account lockout after failed attempts
