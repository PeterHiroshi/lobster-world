// =============================================================================
// Lobster World — Drizzle Migration Runner
// =============================================================================
// Runs all pending Drizzle migrations against the configured database.
// Usage:
//   npx tsx src/db/migrate.ts          # uses DATABASE_URL from env / .env
//   DATABASE_URL=... npx tsx src/db/migrate.ts
// =============================================================================

import 'dotenv/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { resolveDatabaseUrl } from './connection.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(currentDir, '../../drizzle');

async function runMigrations(): Promise<void> {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    console.error('❌ No DATABASE_URL configured. Set DATABASE_URL or POSTGRES_* env vars.');
    process.exit(1);
  }

  console.log('🐘 Connecting to database...');
  // Use a single connection for migrations (no pool needed)
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(sql);

  try {
    console.log(`📂 Migrations folder: ${migrationsFolder}`);
    console.log('🔄 Running pending migrations...');
    await migrate(db, { migrationsFolder });
    console.log('✅ All migrations applied successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
