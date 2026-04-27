import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts', 'src/**/*.spec.ts',
        'src/db/migrate.ts',
        'src/main.ts',
        'src/app.module.ts',
        'src/**/**.module.ts',
        'src/app.controller.ts',
        'src/monitoring/**',
        'src/types/**',
        'src/db/schema.ts',
        'src/db/db.module.ts',
      ],
    },
  },
});
