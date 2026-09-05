/**
 * CyTutor Backend Server
 *
 * Entry point: initialises runtime services and starts listening.
 * The Express app itself lives in app.ts so tests can import it
 * without triggering server startup.
 */

import app from './app.js';
import config, { isProduction } from './config/index.js';
import { logger } from './utils/logger.js';
import { handleUnhandledRejection, handleUncaughtException } from './middleware/errorHandler.js';
import { portManager } from './orchestrator/portManager.js';
import { challengeManager } from './orchestrator/challengeManager.js';
import { verifyConnection } from './services/email.js';
import { cleanupExpiredOTPs } from './services/otpService.js';
import './services/scheduler.js'; // Initialize cron jobs

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

async function startServer() {
  try {
    logger.info('Starting CyTutor server...', {
      environment: config.env,
      nodeVersion: process.version,
    });

    // Initialize port manager
    await portManager.initialize();
    logger.info('Port manager initialized');

    // Verify email service connection
    if (config.email.enabled) {
      const emailConnected = await verifyConnection();
      if (emailConnected) {
        logger.info('Email service connected');
      } else {
        logger.warn('Email service not connected (check configuration)');
      }
    } else {
      logger.info('Email service disabled (no credentials provided)');
    }

    // Setup cleanup intervals
    const challengeCleanupInterval = 5 * 60 * 1000; // 5 minutes
    setInterval(() => {
      logger.debug('Running challenge cleanup...');
      challengeManager.cleanupExpiredChallenges().catch(err => {
        logger.error('Challenge cleanup failed', err);
      });
    }, challengeCleanupInterval);

    const otpCleanupInterval = 10 * 60 * 1000; // 10 minutes
    setInterval(() => {
      logger.debug('Running OTP cleanup...');
      cleanupExpiredOTPs().catch(err => {
        logger.error('OTP cleanup failed', err);
      });
    }, otpCleanupInterval);

    // Start listening
    app.listen(config.server.port, config.server.host, () => {
      logger.info('Server started successfully', {
        host: config.server.host,
        port: config.server.port,
        url: `http://${config.server.host}:${config.server.port}`,
      });

      if (isProduction()) {
        logger.info('Running in PRODUCTION mode');
        logger.info('Security features enabled:', {
          helmet: config.security.enableHelmet,
          csrf: config.security.enableCsrf,
          trustProxy: config.security.trustProxy,
          cookieSecure: config.security.cookieSecure,
        });
      } else {
        logger.info('Running in DEVELOPMENT mode');
        logger.warn('Some security features are relaxed for development');
      }
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
