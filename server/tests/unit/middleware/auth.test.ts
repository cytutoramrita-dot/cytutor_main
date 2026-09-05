import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from '../../../src/middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET!;

const makeReq = (authHeader?: string): AuthRequest =>
  ({ headers: { authorization: authHeader } } as AuthRequest);

const makeRes = (): Response => ({} as Response);

const makeNext = () => vi.fn() as unknown as NextFunction;

describe('authenticate middleware', () => {
  it('calls next with 401 when no Authorization header is present', () => {
    const next = makeNext();
    authenticate(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
    const err = (next as any).mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/no token/i);
  });

  it('calls next with 401 when header does not start with "Bearer "', () => {
    const next = makeNext();
    authenticate(makeReq('Basic abc123'), makeRes(), next);
    const err = (next as any).mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('calls next with 401 for a malformed / invalid token', () => {
    const next = makeNext();
    authenticate(makeReq('Bearer notavalidtoken'), makeRes(), next);
    const err = (next as any).mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/invalid token/i);
  });

  it('calls next with 401 and "Token expired" for an expired token', () => {
    const expiredToken = jwt.sign({ userId: 'user-1' }, JWT_SECRET, {
      expiresIn: -1,
    });
    const next = makeNext();
    authenticate(makeReq(`Bearer ${expiredToken}`), makeRes(), next);
    const err = (next as any).mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/token expired/i);
  });

  it('sets req.userId and calls next() with no error for a valid token', () => {
    const token = jwt.sign({ userId: 'user-42' }, JWT_SECRET, {
      expiresIn: '1h',
    });
    const req = makeReq(`Bearer ${token}`);
    const next = makeNext();
    authenticate(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(); // called with no arguments = success
    expect(req.userId).toBe('user-42');
  });
});
