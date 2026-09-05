/**
 * Security Middleware
 * 
 * Provides security-related middleware including CORS, helmet configuration,
 * and other security headers.
 */

import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import config, { isProduction } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Configure CORS based on environment
 */
export const configureCors = () => {
  const corsOptions: CorsOptions = {
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
  };

  if (isProduction()) {
    // Production: Use whitelist or allow all if explicitly configured
    if (config.cors.allowAllOrigins) {
      logger.warn('CORS: Allowing all origins in production (CORS_ALLOW_ALL=true)');
      corsOptions.origin = (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        callback(null, true);
      };
    } else if (config.cors.origins.length > 0) {
      logger.info('CORS: Using whitelist', { origins: config.cors.origins });
      corsOptions.origin = (origin, callback) => {
        // Allow requests with no origin
        if (!origin) {
          return callback(null, true);
        }
        
        if (config.cors.origins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn('CORS: Blocked origin', { origin });
          callback(new Error('Not allowed by CORS'));
        }
      };
    } else {
      // No origins configured - very restrictive
      logger.warn('CORS: No origins configured, blocking all cross-origin requests');
      corsOptions.origin = false;
    }
  } else {
    // Development: Allow configured localhost origins
    logger.debug('CORS: Development mode', { origins: config.cors.origins });
    corsOptions.origin = config.cors.origins;
  }

  return cors(corsOptions);
};

/**
 * Configure Helmet security headers
 */
export const configureHelmet = () => {
  if (!config.security.enableHelmet) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  if (isProduction() && config.security.helmetOptions) {
    return helmet(config.security.helmetOptions);
  }

  // Development: Use relaxed helmet settings
  return helmet({
    contentSecurityPolicy: false, // Disable CSP in dev for easier debugging
    crossOriginEmbedderPolicy: false,
  });
};

/**
 * Additional security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (isProduction()) {
    // HSTS header (only in production with HTTPS)
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  next();
};

/**
 * Trust proxy configuration
 */
export const configureTrustProxy = (app: any) => {
  if (config.security.trustProxy) {
    app.set('trust proxy', 1);
    logger.info('Trust proxy enabled');
  }
};

/**
 * Input sanitization middleware
 * Prevents common injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  
  return sanitized;
}

/**
 * Sanitize a single value
 */
function sanitizeValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove null bytes
  value = value.replace(/\0/g, '');
  
  // Trim whitespace
  value = value.trim();
  
  return value;
}

/**
 * Prevent parameter pollution
 */
export const preventParameterPollution = (req: Request, res: Response, next: NextFunction) => {
  // Convert array parameters to single values (take first)
  if (req.query) {
    for (const key in req.query) {
      if (Array.isArray(req.query[key])) {
        req.query[key] = (req.query[key] as string[])[0];
      }
    }
  }
  
  next();
};
