import type { PublicKeyRecord } from '@lobster-world/protocol';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../connection.js';
import { publicKeys } from '../schema.js';

export interface KeyStoreRepository {
  store(lobsterId: string, x25519PublicKey: string): Promise<PublicKeyRecord>;
  get(lobsterId: string): Promise<PublicKeyRecord | undefined>;
  getAll(): Promise<PublicKeyRecord[]>;
  remove(lobsterId: string): Promise<boolean>;
  size(): Promise<number>;
}

export class InMemoryKeyStoreRepo implements KeyStoreRepository {
  private keys = new Map<string, PublicKeyRecord>();

  async store(lobsterId: string, x25519PublicKey: string): Promise<PublicKeyRecord> {
    const record: PublicKeyRecord = {
      lobsterId,
      x25519PublicKey,
      updatedAt: Date.now(),
    };
    this.keys.set(lobsterId, record);
    return record;
  }

  async get(lobsterId: string): Promise<PublicKeyRecord | undefined> {
    return this.keys.get(lobsterId);
  }

  async getAll(): Promise<PublicKeyRecord[]> {
    return [...this.keys.values()];
  }

  async remove(lobsterId: string): Promise<boolean> {
    return this.keys.delete(lobsterId);
  }

  async size(): Promise<number> {
    return this.keys.size;
  }
}

function rowToRecord(row: typeof publicKeys.$inferSelect): PublicKeyRecord {
  return {
    lobsterId: row.lobsterId,
    x25519PublicKey: row.x25519PublicKey,
    updatedAt: row.updatedAt,
  };
}

export class PgKeyStoreRepo implements KeyStoreRepository {
  constructor(private db: Database) {}

  async store(lobsterId: string, x25519PublicKey: string): Promise<PublicKeyRecord> {
    const now = Date.now();
    const [row] = await this.db
      .insert(publicKeys)
      .values({
        lobsterId,
        x25519PublicKey,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: publicKeys.lobsterId,
        set: {
          x25519PublicKey,
          updatedAt: now,
        },
      })
      .returning();
    return rowToRecord(row);
  }

  async get(lobsterId: string): Promise<PublicKeyRecord | undefined> {
    const [row] = await this.db.select().from(publicKeys).where(eq(publicKeys.lobsterId, lobsterId));
    return row ? rowToRecord(row) : undefined;
  }

  async getAll(): Promise<PublicKeyRecord[]> {
    const rows = await this.db.select().from(publicKeys);
    return rows.map(rowToRecord);
  }

  async remove(lobsterId: string): Promise<boolean> {
    const result = await this.db.delete(publicKeys).where(eq(publicKeys.lobsterId, lobsterId)).returning();
    return result.length > 0;
  }

  async size(): Promise<number> {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(publicKeys);
    return Number(result.count);
  }
}
