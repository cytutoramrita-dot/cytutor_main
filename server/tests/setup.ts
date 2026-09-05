import { vi, afterEach } from 'vitest';

// Suppress logger output during tests to keep output clean
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Suppress scheduler cron jobs from starting
vi.mock('../src/services/scheduler.js', () => ({}));

afterEach(() => {
  vi.clearAllMocks();
});
