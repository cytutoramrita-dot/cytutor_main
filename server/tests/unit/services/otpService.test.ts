import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB before importing the service so no real connection is attempted
vi.mock('../../../src/db/index.js', () => ({
  query: vi.fn(),
  pool: { end: vi.fn() },
}));

// Mock email sending
vi.mock('../../../src/services/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { generateOTP, storeOTP, verifyOTP, cleanupExpiredOTPs } from '../../../src/services/otpService.js';
import { query } from '../../../src/db/index.js';

const mockQuery = vi.mocked(query);

describe('generateOTP', () => {
  it('returns a 6-character string', () => {
    expect(generateOTP()).toHaveLength(6);
  });

  it('contains only digits', () => {
    expect(generateOTP()).toMatch(/^\d{6}$/);
  });

  it('is within the valid 6-digit range', () => {
    const otp = Number(generateOTP());
    expect(otp).toBeGreaterThanOrEqual(100000);
    expect(otp).toBeLessThanOrEqual(999999);
  });

  it('produces different values across calls (not always identical)', () => {
    const results = new Set(Array.from({ length: 20 }, () => generateOTP()));
    // 20 calls should produce more than 1 unique value
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('storeOTP', () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
  });

  it('inserts an OTP row into the database', async () => {
    await storeOTP('user@example.com', '123456', 'signup');
    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO otps');
    expect(params).toContain('user@example.com');
    expect(params).toContain('123456');
    expect(params).toContain('signup');
  });
});

describe('verifyOTP', () => {
  it('returns false when no matching OTP row is found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    const result = await verifyOTP('user@example.com', '000000', 'signup');
    expect(result).toBe(false);
  });

  it('returns true and marks the OTP as used when found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 99 }], rowCount: 1 } as any) // SELECT
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);            // UPDATE

    const result = await verifyOTP('user@example.com', '123456', 'signup');
    expect(result).toBe(true);
    // Second call should UPDATE is_used
    const [updateSql] = mockQuery.mock.calls[1];
    expect(updateSql).toContain('is_used = TRUE');
  });
});

describe('cleanupExpiredOTPs', () => {
  it('deletes expired OTP rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    await cleanupExpiredOTPs();
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('DELETE FROM otps');
    expect(sql).toContain('expires_at');
  });
});
