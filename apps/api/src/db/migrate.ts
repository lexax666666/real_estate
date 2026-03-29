import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as path from 'path';

async function runMigrations() {
  const databaseUrl = process.env.POSTGRES_URL;
  if (!databaseUrl) {
    console.error('POSTGRES_URL environment variable is required');
    process.exit(1);
  }

  console.log('Running database migrations...');

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, '../../drizzle'),
  });

  console.log('Migrations completed successfully');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
