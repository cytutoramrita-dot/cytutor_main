import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from './errorHandler.js';
import { query } from '../db/index.js';

export interface AuthRequest extends Request {
  userId?: string;
  user?: { id: string; role: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    const userRow = await query('SELECT role FROM users WHERE id = $1', [decoded.userId]);
    const role = userRow.rows[0]?.role ?? 'student';
    req.userId = decoded.userId;
    req.user = { id: decoded.userId, role };

    logger.debug('User authenticated', { userId: decoded.userId, role });
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'Token expired'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'Invalid token'));
    }
    return next(new AppError(401, 'Authentication failed'));
  }
};
