import { query } from '../db/index.js';
import { sendEmail } from './email.js';
import config from '../config/index.js';

// Generate 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in database
export const storeOTP = async (
  email: string,
  otpCode: string,
  otpType: 'signup' | 'forgot_password'
): Promise<void> => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await query(
    `INSERT INTO otps (email, otp_code, otp_type, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [email, otpCode, otpType, expiresAt]
  );
};

// Verify OTP
export const verifyOTP = async (
  email: string,
  otpCode: string,
  otpType: 'signup' | 'forgot_password'
): Promise<boolean> => {
  const result = await query(
    `SELECT * FROM otps 
     WHERE email = $1 
     AND otp_code = $2 
     AND otp_type = $3 
     AND is_used = FALSE 
     AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [email, otpCode, otpType]
  );

  if (result.rows.length === 0) {
    return false;
  }

  // Mark OTP as used
  await query(
    `UPDATE otps SET is_used = TRUE WHERE id = $1`,
    [result.rows[0].id]
  );

  return true;
};

// Send OTP email
export const sendOTPEmail = async (
  email: string,
  otpCode: string,
  otpType: 'signup' | 'forgot_password'
): Promise<void> => {
  const subject = otpType === 'signup' 
    ? 'CyTutor - Verify Your Email' 
    : 'CyTutor - Password Reset Code';

  const text = `Your verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`;

  const html = `
    <div style="font-family: monospace; background: #000; color: #22c55e; padding: 20px; border: 2px solid #22c55e;">
      <h2 style="color: #22c55e;">CyTutor Security Alert</h2>
      <p>Your verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 8px; color: #fff; background: #22c55e20; padding: 15px; border: 1px solid #22c55e;">
        ${otpCode}
      </h1>
      <p style="color: #888;">This code will expire in 10 minutes.</p>
      <p style="color: #888; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  if (!config.email.enabled) {
    console.log(`[DEV] Email not configured — OTP for ${email}: ${otpCode}`);
    return;
  }

  await sendEmail(email, subject, text, html);
};

// Clean up expired OTPs (should be run periodically)
export const cleanupExpiredOTPs = async (): Promise<void> => {
  await query(`DELETE FROM otps WHERE expires_at < NOW()`);
};
