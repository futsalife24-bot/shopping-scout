import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['tests/**/*.spec.ts'],
    exclude: ['node_modules'],
    environment: 'node',
    globals: true
  }
});

