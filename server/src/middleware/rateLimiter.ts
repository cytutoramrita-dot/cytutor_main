/**
 * Rate Limiting Middleware
 * 
 * Provides configurable rate limiting for different endpoint types.
 */

import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in test and local development environments
    return config.env === 'test' || config.env === 'development';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({ error: 'Too many requests, please try again later' });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: (req) => {
    return config.env === 'test';
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      email: req.body?.email,
    });
    res.status(429).json({ 
      error: 'Too many authentication attempts, please try again later',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000 / 60), // minutes
    });
  },
});

/**
 * Stricter rate limiter for sensitive operations
 */
export const strictLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.floor(config.rateLimit.authMax / 2), // Half of auth limit
  message: { error: 'Too many requests for this operation' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return config.env === 'test';
  },
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: (req as any).userId,
    });
    res.status(429).json({ error: 'Too many requests for this operation' });
  },
});

/**
 * Create a custom rate limiter with specific options
 */
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.max,
    message: { error: options.message || 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return config.env === 'test';
    },
  });
};
