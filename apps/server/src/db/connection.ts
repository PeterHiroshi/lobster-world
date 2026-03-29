import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export interface PoolConfig {
  /** Maximum number of connections in the pool (default: 10) */
  max: number;
  /** Idle connection timeout in seconds (default: 20) */
  idleTimeout: number;
  /** Connection timeout in seconds (default: 10) */
  connectTimeout: number;
  /** Maximum lifetime of a connection in seconds; 0 = unlimited (default: 0) */
  maxLifetime: number;
}

export interface DatabaseConnection {
  db: Database;
  sql: postgres.Sql;
  poolConfig: PoolConfig;
  close: () => Promise<void>;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  max: 10,
  idleTimeout: 20,
  connectTimeout: 10,
  maxLifetime: 0,
};

/**
 * Read pool configuration from environment variables, falling back to defaults.
 */
export function getPoolConfigFromEnv(): PoolConfig {
  return {
    max: envInt('DB_POOL_MAX', DEFAULT_POOL_CONFIG.max),
    idleTimeout: envInt('DB_POOL_IDLE_TIMEOUT', DEFAULT_POOL_CONFIG.idleTimeout),
    connectTimeout: envInt('DB_POOL_CONNECT_TIMEOUT', DEFAULT_POOL_CONFIG.connectTimeout),
    maxLifetime: envInt('DB_POOL_MAX_LIFETIME', DEFAULT_POOL_CONFIG.maxLifetime),
  };
}

/**
 * Build a DATABASE_URL from individual PG_* env vars (fallback when DATABASE_URL is not set).
 */
export function buildDatabaseUrlFromEnv(): string | undefined {
  const host = process.env.POSTGRES_HOST;
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const db = process.env.POSTGRES_DB;

  if (host && user && password && db) {
    return `postgres://${user}:${password}@${host}:${port}/${db}`;
  }
  return undefined;
}

/**
 * Resolve the database URL: prefer DATABASE_URL, then build from individual vars.
 */
export function resolveDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL || buildDatabaseUrlFromEnv();
}

/**
 * Create a Drizzle database connection with connection pooling.
 */
export async function createDatabaseConnection(
  databaseUrl: string,
  overrides?: Partial<PoolConfig>,
): Promise<DatabaseConnection> {
  const poolConfig: PoolConfig = { ...getPoolConfigFromEnv(), ...overrides };

  const sql = postgres(databaseUrl, {
    max: poolConfig.max,
    idle_timeout: poolConfig.idleTimeout,
    connect_timeout: poolConfig.connectTimeout,
    max_lifetime: poolConfig.maxLifetime || undefined,
    onnotice: () => {}, // suppress NOTICE messages
  });

  const db = drizzle(sql, { schema });

  // Verify connectivity with a quick query
  try {
    await sql`SELECT 1`;
  } catch (err) {
    await sql.end();
    throw new Error(`Database connection failed: ${(err as Error).message}`);
  }

  return {
    db,
    sql,
    poolConfig,
    close: async () => {
      await sql.end({ timeout: 5 });
    },
  };
}

/** Parse an integer from env, with a default fallback. */
function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
