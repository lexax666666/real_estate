import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@api': path.resolve(__dirname, '../api/src'),
    },
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: [
        'src/sites/sdat/sdat-csv-import.service.ts',
        'src/sites/sdat/sdat-parser.service.ts',
        'src/sites/sdat/sdat.adapter.ts',
        'src/sites/sdat/sdat.constants.ts',
        'src/core/address-parser.util.ts',
      ],
      exclude: [
        'src/**/*.test.ts', 'src/**/*.spec.ts',
        'src/main.ts',
        'src/app.module.ts',
        'src/**/**.module.ts',
        'src/app.controller.ts',
        'src/health.controller.ts',
        'src/bull-board/**',
        'src/db/**',
        'src/queue/**',
        'src/core/interfaces/**',
        'src/core/crawler-db.service.ts',
        'src/core/crawl.processor.ts',
        'src/core/crawl-discovery.service.ts',
        'src/sites/sdat/sdat-csv-import.command.ts',
        'src/sites/sdat/sdat-browser.service.ts',
        'src/sites/sdat/sdat.types.ts',
      ],
    },
  },
});
