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
  },
});
