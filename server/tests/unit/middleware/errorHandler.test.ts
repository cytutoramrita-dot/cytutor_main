import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AppError, asyncHandler, errorHandler } from '../../../src/middleware/errorHandler.js';

const makeReq = () => ({ path: '/test', method: 'GET', ip: '127.0.0.1' } as Request);

const makeRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
};

const makeNext = () => vi.fn() as unknown as NextFunction;

describe('AppError', () => {
  it('stores statusCode and message', () => {
    const err = new AppError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.isOperational).toBe(true);
  });

  it('is an instance of Error', () => {
    const err = new AppError(500, 'Oops');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('asyncHandler', () => {
  it('passes resolved async handler values through normally', async () => {
    const handler = asyncHandler(async (_req: Request, res: Response) => {
      res.json({ ok: true });
    });
    const res = makeRes();
    await handler(makeReq(), res, makeNext());
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('passes rejection to next() as an error', async () => {
    const thrown = new Error('async failure');
    const handler = asyncHandler(async () => {
      throw thrown;
    });
    const next = makeNext();
    await handler(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledWith(thrown);
  });
});

describe('errorHandler', () => {
  it('responds with AppError statusCode and message', () => {
    const res = makeRes();
    const err = new AppError(422, 'Unprocessable');
    errorHandler(err, makeReq(), res, makeNext());
    expect(res.status).toHaveBeenCalledWith(422);
    expect((res.json as any).mock.calls[0][0]).toMatchObject({ error: 'Unprocessable' });
  });

  it('responds with 500 for generic (non-AppError) errors', () => {
    const res = makeRes();
    errorHandler(new Error('something broke'), makeReq(), res, makeNext());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
