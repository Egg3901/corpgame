import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    hookTimeout: 30000, // 30 seconds for MongoDB connection
    testTimeout: 10000, // 10 seconds per test
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/finance.ts',
        'lib/utils.ts',
        'app/login/page.tsx',
        'app/api/corporation/list/route.ts',
      ],
      exclude: ['**/*.d.ts', 'tests/**', 'node_modules/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
      },
    },
  },
});
