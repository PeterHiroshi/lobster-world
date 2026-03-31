/**
 * PostgreSQL Test Helpers
 * =======================
 * Provides setup/teardown for running tests against a real PostgreSQL database.
 *
 * Connection strategy (in priority order):
 * 1. TEST_DATABASE_URL env var → external PostgreSQL
 * 2. PGlite (in-memory embedded PG) → always available, no external deps
 *
 * Usage:
 *   import { pgTestSuite } from './helpers/pg-test-helpers.js';
 *
 *   pgTestSuite('MyEngine (PG)', ({ getDb }) => {
 *     it('does something', async () => {
 *       const db = getDb();
 *       // ... test with real PG
 *     });
 *   });
 */

import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import * as schema from '../../src/db/schema.js';
import type { Database, DatabaseConnection, PoolConfig } from '../../src/db/connection.js';

// All tables to truncate between tests
const ALL_TABLES = [
  'lobsters',
  'tasks',
  'documents',
  'code_submissions',
  'a2a_messages',
  'audit_log',
  'meetings',
  'agent_messages',
  'public_keys',
  'skin_presets',
] as const;

export function getTestDatabaseUrl(): string | undefined {
  return process.env.TEST_DATABASE_URL;
}

export interface PgTestContext {
  /** Get the Drizzle database instance */
  getDb: () => Database;
}

type TruncateFn = () => Promise<void>;
type CloseFn = () => Promise<void>;
type InitFn = () => Promise<void>;

/**
 * Creates a describe block that runs against PGlite (embedded) or external PG.
 * Always runs — PGlite requires no external dependencies.
 */
export function pgTestSuite(
  name: string,
  fn: (ctx: PgTestContext) => void,
): void {
  const testUrl = getTestDatabaseUrl();

  describe(name, () => {
    let db: Database;
    let truncate: TruncateFn;
    let close: CloseFn;
    let init: InitFn;

    beforeAll(async () => {
      if (testUrl) {
        // Use external PostgreSQL
        const result = await setupExternalPg(testUrl);
        db = result.db;
        truncate = result.truncate;
        close = result.close;
        init = result.init;
      } else {
        // Use PGlite (embedded)
        const result = await setupPglite();
        db = result.db;
        truncate = result.truncate;
        close = result.close;
        init = result.init;
      }

      await init();
    });

    afterAll(async () => {
      await close();
    });

    beforeEach(async () => {
      await truncate();
    });

    const ctx: PgTestContext = {
      getDb: () => db,
    };

    fn(ctx);
  });
}

// ---------------------------------------------------------------------------
// External PostgreSQL setup
// ---------------------------------------------------------------------------

async function setupExternalPg(url: string) {
  const sqlClient = postgres(url, {
    max: 5,
    idle_timeout: 10,
    connect_timeout: 5,
    onnotice: () => {},
  });

  const db = drizzlePg(sqlClient, { schema }) as unknown as Database;

  return {
    db,
    init: async () => {
      await sqlClient`SELECT 1`;
      await ensureTablesExistExternal(sqlClient);
    },
    truncate: async () => {
      await sqlClient.unsafe(`TRUNCATE TABLE ${ALL_TABLES.join(', ')} CASCADE`);
    },
    close: async () => {
      await sqlClient.end({ timeout: 5 });
    },
  };
}

// ---------------------------------------------------------------------------
// PGlite (embedded) setup
// ---------------------------------------------------------------------------

async function setupPglite() {
  const pglite = new PGlite();
  const db = drizzlePglite({ client: pglite, schema }) as unknown as Database;

  return {
    db,
    init: async () => {
      await ensureTablesExistPglite(pglite);
    },
    truncate: async () => {
      for (const table of ALL_TABLES) {
        await pglite.exec(`DELETE FROM "${table}"`);
      }
    },
    close: async () => {
      await pglite.close();
    },
  };
}

// ---------------------------------------------------------------------------
// Schema initialization — external PG (via postgres.js)
// ---------------------------------------------------------------------------

async function ensureTablesExistExternal(sql: postgres.Sql): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
  await createAllTables((ddl) => sql.unsafe(ddl));
}

// ---------------------------------------------------------------------------
// Schema initialization — PGlite
// ---------------------------------------------------------------------------

async function ensureTablesExistPglite(pglite: PGlite): Promise<void> {
  // PGlite has uuid-ossp but not pgcrypto; we override gen_random_uuid() as a function
  try {
    await pglite.exec('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  } catch {
    // pgcrypto not available in PGlite; create a compat function
    await pglite.exec(`
      CREATE OR REPLACE FUNCTION gen_random_uuid() RETURNS uuid
      LANGUAGE sql AS $$ SELECT uuid_in(md5(random()::text || clock_timestamp()::text)::cstring)::uuid $$
    `);
  }
  await createAllTables((ddl) => pglite.exec(ddl).then(() => {}));
}

// ---------------------------------------------------------------------------
// Shared table DDL
// ---------------------------------------------------------------------------

async function createAllTables(exec: (ddl: string) => Promise<void>): Promise<void> {
  const ddls = [
    `CREATE TABLE IF NOT EXISTS lobsters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      skills JSONB DEFAULT '[]',
      bio TEXT,
      avatar TEXT,
      status TEXT DEFAULT 'offline',
      source TEXT,
      last_seen TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id TEXT,
      created_by TEXT NOT NULL,
      subtasks JSONB DEFAULT '[]',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      tags JSONB DEFAULT '[]',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS code_submissions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      language TEXT NOT NULL,
      author TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      comments JSONB DEFAULT '[]',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS a2a_messages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_ids JSONB NOT NULL,
      payload JSONB NOT NULL,
      correlation_id TEXT,
      ttl INTEGER,
      timestamp BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      event_type TEXT NOT NULL,
      participants JSONB NOT NULL,
      details TEXT NOT NULL,
      timestamp BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      participants JSONB DEFAULT '[]',
      messages JSONB DEFAULT '[]',
      decisions JSONB DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active'
    )`,
    `CREATE TABLE IF NOT EXISTS agent_messages (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      context JSONB,
      timestamp BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS public_keys (
      lobster_id TEXT PRIMARY KEY,
      x25519_public_key TEXT NOT NULL,
      updated_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS skin_presets (
      id TEXT PRIMARY KEY,
      lobster_id TEXT NOT NULL,
      body_color TEXT NOT NULL,
      claw1_color TEXT,
      claw2_color TEXT,
      accessory_type TEXT,
      tail_style TEXT,
      eye_color TEXT,
      eye_style TEXT
    )`,
    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_lobsters_status ON lobsters (status)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks (assignee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_category ON documents (category)`,
    `CREATE INDEX IF NOT EXISTS idx_code_submissions_status ON code_submissions (status)`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_messages_from_id ON a2a_messages (from_id)`,
    `CREATE INDEX IF NOT EXISTS idx_a2a_messages_correlation_id ON a2a_messages (correlation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log (event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log (timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_messages_from_to ON agent_messages (from_id, to_id)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_messages_timestamp ON agent_messages (timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_skin_presets_lobster_id ON skin_presets (lobster_id)`,
  ];

  for (const ddl of ddls) {
    await exec(ddl);
  }
}
