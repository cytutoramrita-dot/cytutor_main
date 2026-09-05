/**
 * Centralized Configuration Module
 * 
 * This module provides environment-specific configuration for the application.
 * It reads from environment variables and provides safe defaults.
 * 
 * Environment Variables:
 * - NODE_ENV: 'development' | 'production' | 'test'
 * - DATABASE_URL: PostgreSQL connection string
 * - JWT_SECRET: Secret key for JWT signing
 * - PORT: Server port (default: 3001)
 * - HOST: Server host (auto-configured based on NODE_ENV)
 * - CHALLENGE_PORT_MIN: Minimum port for challenge containers
 * - CHALLENGE_PORT_MAX: Maximum port for challenge containers
 * - CHALLENGE_TIMEOUT_MINUTES: Challenge container timeout
 * - CORS_ORIGINS: Comma-separated list of allowed origins (production only)
 * - EMAIL_SERVICE: Email service provider
 * - EMAIL_USER: Email username
 * - EMAIL_PASS: Email password
 * - RATE_LIMIT_WINDOW_MS: Rate limit window in milliseconds
 * - RATE_LIMIT_MAX: Maximum requests per window
 * - AUTH_RATE_LIMIT_MAX: Maximum auth requests per window
 * - LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env file
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Determine environment
const NODE_ENV = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Base configuration shared across all environments
const baseConfig = {
  env: NODE_ENV,
  
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',
  },
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL!,
    // Additional pool configuration can be added here
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
    },
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Challenge orchestration
  challenges: {
    portMin: parseInt(process.env.CHALLENGE_PORT_MIN || '10000', 10),
    portMax: parseInt(process.env.CHALLENGE_PORT_MAX || '20000', 10),
    timeoutMinutes: parseInt(process.env.CHALLENGE_TIMEOUT_MINUTES || '45', 10),
    hostIp: process.env.HOST_IP || undefined, // Optional override
  },
  
  // Email configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.office365.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    enabled: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
  },
  
  // Logging
  logging: {
    level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  },
};

// Development-specific configuration
const developmentConfig = {
  ...baseConfig,
  
  cors: {
    origins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  },
  
  security: {
    enableHelmet: true,
    enableCsrf: false, // Disabled in dev for easier testing
    trustProxy: false,
    cookieSecure: false, // Allow non-HTTPS cookies in dev
  },
  
  logging: {
    level: 'debug' as 'debug' | 'info' | 'warn' | 'error',
    prettyPrint: true,
    includeStackTrace: true,
  },
};

// Production-specific configuration
const productionConfig = {
  ...baseConfig,
  
  cors: {
    // Parse comma-separated origins from env, or use restrictive default
    origins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : [], // Empty array means no CORS in production unless explicitly configured
    credentials: true,
    // In production, you might want to be more restrictive
    allowAllOrigins: process.env.CORS_ALLOW_ALL === 'true', // Explicit opt-in
  },
  
  security: {
    enableHelmet: true,
    enableCsrf: true,
    trustProxy: true, // Trust proxy headers (X-Forwarded-For, etc.)
    cookieSecure: true, // Require HTTPS for cookies
    helmetOptions: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Adjust based on your needs
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    },
  },
  
  logging: {
    level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    prettyPrint: false,
    includeStackTrace: false, // Never expose stack traces in production
  },
};

// Test-specific configuration
const testConfig = {
  ...baseConfig,
  
  server: {
    port: parseInt(process.env.PORT || '3002', 10), // Different port for tests
    host: '127.0.0.1',
  },
  
  cors: {
    origins: ['http://localhost:3000'],
    credentials: true,
  },
  
  security: {
    enableHelmet: false, // Simplified for testing
    enableCsrf: false,
    trustProxy: false,
    cookieSecure: false,
  },
  
  logging: {
    level: 'error' as 'debug' | 'info' | 'warn' | 'error',
    prettyPrint: false,
    includeStackTrace: true,
  },
  
  // Use faster hashing for tests
  bcrypt: {
    rounds: 4, // Faster for tests
  },
};

// Select configuration based on environment
const envConfigs = {
  development: developmentConfig,
  production: productionConfig,
  test: testConfig,
};

const config = envConfigs[NODE_ENV];

// Export configuration
export default config;

// Export type for TypeScript
export type Config = typeof config;

// Helper function to check if we're in production
export const isProduction = () => NODE_ENV === 'production';
export const isDevelopment = () => NODE_ENV === 'development';
export const isTest = () => NODE_ENV === 'test';
