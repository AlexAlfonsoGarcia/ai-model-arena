/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.js'],
  },
});