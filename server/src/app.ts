/**
 * Express application factory
 *
 * Exports the configured Express app without starting the server.
 * Import this in tests to get a testable app instance.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.js';
import {
  configureCors,
  configureHelmet,
  securityHeaders,
  configureTrustProxy,
  sanitizeInput,
  preventParameterPollution,
} from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import challengeRoutes from './routes/challenges.js';
import tutorialRoutes from './routes/tutorials.js';
import courseRoutes from './routes/courses.js';
import analyticsRoutes from './routes/analytics.js';
import classroomRoutes from './routes/classrooms.js';
import communityRoutes from './routes/communities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

configureTrustProxy(app);

app.use(configureHelmet());
app.use(securityHeaders);
app.use(configureCors());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);
app.use(preventParameterPollution);
app.use('/api', apiLimiter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/tutorials', tutorialRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/communities', communityRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
