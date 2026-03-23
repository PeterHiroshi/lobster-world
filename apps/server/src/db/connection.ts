import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export interface DatabaseConnection {
  db: Database;
  close: () => Promise<void>;
}

export async function createDatabaseConnection(databaseUrl: string): Promise<DatabaseConnection> {
  const client = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(client, { schema });

  return {
    db,
    close: async () => {
      await client.end();
    },
  };
}
