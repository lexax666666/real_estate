#!/usr/bin/env tsx
/**
 * CLI command to import Maryland Parcel Points CSV into the database.
 *
 * Usage:
 *   pnpm dlx tsx apps/crawler/src/sites/sdat/sdat-csv-import.command.ts <csv-file-path>
 *
 * Requires POSTGRES_URL environment variable to be set.
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../../api/src/db/schema';
import { importCsv, ImportStats } from './sdat-csv-import.service';

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

  console.log('Connecting to database...');
  const sql = neon(postgresUrl);
  const db = drizzle(sql, { schema });

  console.log('Starting CSV import...');
  console.log('---');

  const stats: ImportStats = await importCsv(db, absolutePath, (msg) => {
    console.log(`[import] ${msg}`);
  });

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
  console.log(
    `  Rate:        ${Math.round(stats.totalRows / (stats.elapsedMs / 1000))}/sec`,
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
