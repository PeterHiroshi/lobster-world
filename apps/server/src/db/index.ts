export {
  createDatabaseConnection,
  resolveDatabaseUrl,
  buildDatabaseUrlFromEnv,
  getPoolConfigFromEnv,
} from './connection.js';
export type { Database, DatabaseConnection, PoolConfig } from './connection.js';
export * as schema from './schema.js';

// Re-export migrate entrypoint path for documentation purposes.
// To run migrations programmatically, import from './migrate.js'.
