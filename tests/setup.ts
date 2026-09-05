import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Silence api.ts console.log that runs at module level
vi.spyOn(console, 'log').mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});
