import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/cytutor_test',
      JWT_SECRET: 'test-jwt-secret-do-not-use-in-production',
    },
  },
});
