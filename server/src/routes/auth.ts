import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import config from '../config/index.js';
import { query } from '../db/index.js';
import { generateOTP, storeOTP, verifyOTP, sendOTPEmail } from '../services/otpService.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Bcrypt rounds (faster in test environment)
const BCRYPT_ROUNDS = config.env === 'test' && (config as any).bcrypt?.rounds 
  ? (config as any).bcrypt.rounds 
  : 10;

// Validation Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const verifyOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const checkEmailSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Validation Middleware
const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, error.issues[0].message));
    }
    next(new AppError(400, 'Invalid input'));
  }
};

const createAuthToken = (userId: string) =>
  jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
  );

const getAuthUserPayload = async (userId: string) => {
  const result = await query(
    `SELECT id, email, username, full_name, is_profile_complete, is_email_verified
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'User not found');
  }

  const user = result.rows[0];

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.full_name,
    isProfileComplete: user.is_profile_complete,
    isEmailVerified: user.is_email_verified,
  };
};

router.post('/check-email', authLimiter, validate(checkEmailSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const result = await query(
    'SELECT id, is_email_verified FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];

  res.json({
    exists: !!user && user.is_email_verified,
    requiresVerification: !!user && !user.is_email_verified,
  });
}));

// Step 1: Register - Send OTP
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Check if user already exists and is verified
  const existingUser = await query('SELECT id, is_email_verified FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0 && existingUser.rows[0].is_email_verified) {
    throw new AppError(400, 'Email already registered');
  }

  // Generate and send OTP
  const otpCode = generateOTP();
  console.log("Generated OTP:" ,otpCode)
  await storeOTP(email, otpCode, 'signup');
  await sendOTPEmail(email, otpCode, 'signup');

  // Store password temporarily (will be saved after OTP verification)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // If user exists but not verified, update password
  if (existingUser.rows.length > 0) {
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [passwordHash, email]
    );
    logger.info('Updated unverified user', { email });
  } else {
    // Create unverified user
    await query(
      'INSERT INTO users (email, password_hash, is_email_verified) VALUES ($1, $2, FALSE)',
      [email, passwordHash]
    );
    logger.info('Created new user', { email });
  }

  res.json({
    success: true,
    message: 'OTP sent to your email',
    email
  });
}));

// Step 2: Verify OTP and Complete Registration
router.post('/verify-otp', authLimiter, validate(verifyOTPSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  // Verify OTP
  const isValid = await verifyOTP(email, otp, 'signup');
  if (!isValid) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  // Get user and mark as verified
  const result = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'User not found');
  }

  const userId = result.rows[0].id;

  // Mark email as verified
  await query(
    'UPDATE users SET is_email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [userId]
  );

  // Create user stats if not exists
  const statsCheck = await query('SELECT user_id FROM user_stats WHERE user_id = $1', [userId]);
  if (statsCheck.rows.length === 0) {
    await query('INSERT INTO user_stats (user_id) VALUES ($1)', [userId]);
  }

  // Generate JWT token
  const token = createAuthToken(userId);

  logger.info('User verified and logged in', { userId, email });

  const user = await getAuthUserPayload(userId);

  res.json({
    success: true,
    token,
    user
  });
}));

// Login - Password Only
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await query(
    'SELECT id, password_hash, is_email_verified FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError(401, 'Invalid credentials');
  }

  const user = result.rows[0];

  // Check if email is verified
  if (!user.is_email_verified) {
    throw new AppError(403, 'Email not verified. Please complete registration.');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    throw new AppError(401, 'Invalid credentials');
  }

  const token = createAuthToken(user.id);
  const authUser = await getAuthUserPayload(user.id);

  logger.info('User logged in', { userId: user.id, email });

  res.json({
    success: true,
    token,
    user: authUser
  });
}));

router.post('/resend-otp', authLimiter, validate(z.object({
  email: z.string().email(),
  otpType: z.enum(['signup', 'forgot_password']),
})), asyncHandler(async (req: Request, res: Response) => {
  const { email, otpType } = req.body;

  if (otpType === 'signup') {
    const existingUser = await query(
      'SELECT id, is_email_verified FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    if (existingUser.rows[0].is_email_verified) {
      throw new AppError(400, 'Email already verified');
    }
  }

  const otpCode = generateOTP();
  await storeOTP(email, otpCode, otpType);
  await sendOTPEmail(email, otpCode, otpType);

  logger.info('OTP resent', { email, otpType });

  res.json({
    success: true,
    message: 'OTP resent successfully',
  });
}));

// Forgot Password - Send OTP
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  // Check if user exists
  const result = await query(
    'SELECT id, is_email_verified FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0 || !result.rows[0].is_email_verified) {
    // Don't reveal if email exists or not (security best practice)
    logger.debug('Forgot password attempt for non-existent/unverified email', { email });
    return res.json({
      success: true,
      message: 'If the email exists, an OTP has been sent',
      email
    });
  }

  // Generate and send OTP
  const otpCode = generateOTP();
  await storeOTP(email, otpCode, 'forgot_password');
  await sendOTPEmail(email, otpCode, 'forgot_password');

  logger.info('Password reset OTP sent', { email });

  res.json({
    success: true,
    message: 'OTP sent to your email',
    email
  });
}));

// Reset Password with OTP
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  // Verify OTP
  const isValid = await verifyOTP(email, otp, 'forgot_password');
  if (!isValid) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  // Update password
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
    [passwordHash, email]
  );

  logger.info('Password reset successful', { email });

  res.json({
    success: true,
    message: 'Password reset successful'
  });
}));

export default router;
