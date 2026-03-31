#!/usr/bin/env tsx
/**
 * CLI command to import Maryland Parcel Points CSV into the database.
 *
 * Usage:
 *   pnpm dlx tsx apps/crawler/src/sites/sdat/sdat-csv-import.command.ts <csv-file-path>
 *
 * Requires POSTGRES_URL environment variable to be set.
 *
 * Optional env vars (for CI / GitHub Actions):
 *   IMPORT_DRY_RUN     — "true" to skip DB writes (default false)
 *   GITHUB_STEP_SUMMARY — path to summary file (set automatically by GitHub Actions)
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import { stat, appendFile } from 'fs/promises';
import { importCsv, ImportStats, ImportOptions } from './sdat-csv-import.service';

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: tsx sdat-csv-import.command.ts <csv-file-path>');
    process.exit(1);
  }

  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const fileStats = await stat(absolutePath);
  const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(1);
  console.log(`CSV file: ${absolutePath} (${fileSizeMB} MB)`);

  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    console.error('POSTGRES_URL environment variable is required');
    process.exit(1);
  }

  // Read import options from environment
  const options: ImportOptions = {};
  if (process.env.IMPORT_DRY_RUN === 'true') {
    options.dryRun = true;
  }

  console.log('Starting CSV import (streaming COPY + staging upserts)...');
  console.log('---');

  const stats: ImportStats = await importCsv(postgresUrl, absolutePath, (msg) => {
    console.log(`[import] ${msg}`);
  }, options);

  console.log('---');
  console.log('Import complete!');
  console.log(`  Total rows:  ${stats.totalRows.toLocaleString()}`);
  console.log(`  Inserted:    ${stats.inserted.toLocaleString()}`);
  console.log(`  Updated:     ${stats.updated.toLocaleString()}`);
  console.log(`  Skipped:     ${stats.skipped.toLocaleString()}`);
  console.log(`  Errors:      ${stats.errors.toLocaleString()}`);
  console.log(
    `  Elapsed:     ${(stats.elapsedMs / 1000).toFixed(1)}s`,
  );
  const rate = stats.elapsedMs > 0
    ? Math.round(stats.totalRows / (stats.elapsedMs / 1000))
    : 0;
  console.log(`  Rate:        ${rate}/sec`);

  // Write GitHub Actions Job Summary if running in CI
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const dryLabel = options.dryRun ? ' (DRY RUN)' : '';
    const summary = `## SDAT CSV Import Results${dryLabel}

| Metric | Value |
|--------|-------|
| Total rows | ${stats.totalRows.toLocaleString()} |
| Inserted | ${stats.inserted.toLocaleString()} |
| Updated | ${stats.updated.toLocaleString()} |
| Skipped | ${stats.skipped.toLocaleString()} |
| Errors | ${stats.errors.toLocaleString()} |
| Elapsed | ${(stats.elapsedMs / 1000).toFixed(1)}s |
| Rate | ${rate}/sec |
| File size | ${fileSizeMB} MB |
| Method | Streaming COPY + staging upserts |
`;
    await appendFile(summaryPath, summary);
  }

  // Exit with error code if too many errors
  if (stats.errors > 0 && stats.errors > stats.totalRows * 0.01) {
    console.error(`Too many errors (${stats.errors}/${stats.totalRows}), exiting with code 1`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
