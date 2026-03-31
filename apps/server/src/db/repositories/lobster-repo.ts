import type { PublicProfile, LobsterSource } from '@lobster-world/protocol';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../connection.js';
import { lobsters } from '../schema.js';

export interface LobsterRecord {
  id: string;
  name: string;
  color: string;
  skills: string[];
  bio?: string;
  avatar?: string;
  status: string;
  source?: LobsterSource;
  lastSeen?: Date;
  createdAt?: Date;
}

export interface LobsterRepository {
  upsert(profile: PublicProfile, source?: LobsterSource): Promise<LobsterRecord>;
  getById(id: string): Promise<LobsterRecord | undefined>;
  getAll(): Promise<LobsterRecord[]>;
  updateStatus(id: string, status: string): Promise<void>;
  updateLastSeen(id: string): Promise<void>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}

function rowToRecord(row: typeof lobsters.$inferSelect): LobsterRecord {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    skills: (row.skills as string[]) ?? [],
    bio: row.bio ?? undefined,
    avatar: row.avatar ?? undefined,
    status: row.status ?? 'offline',
    source: (row.source as LobsterSource) ?? undefined,
    lastSeen: row.lastSeen ?? undefined,
    createdAt: row.createdAt ?? undefined,
  };
}

export class InMemoryLobsterRepo implements LobsterRepository {
  private records: Map<string, LobsterRecord> = new Map();

  async upsert(profile: PublicProfile, source?: LobsterSource): Promise<LobsterRecord> {
    const existing = this.records.get(profile.id);
    const record: LobsterRecord = {
      id: profile.id,
      name: profile.name,
      color: profile.color,
      skills: [...profile.skills],
      bio: profile.bio,
      avatar: profile.avatar,
      status: existing?.status ?? 'online',
      source,
      lastSeen: new Date(),
      createdAt: existing?.createdAt ?? new Date(),
    };
    this.records.set(profile.id, record);
    return record;
  }

  async getById(id: string): Promise<LobsterRecord | undefined> {
    return this.records.get(id);
  }

  async getAll(): Promise<LobsterRecord[]> {
    return [...this.records.values()];
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.status = status;
    }
  }

  async updateLastSeen(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.lastSeen = new Date();
    }
  }

  async delete(id: string): Promise<boolean> {
    return this.records.delete(id);
  }

  async count(): Promise<number> {
    return this.records.size;
  }
}

export class PgLobsterRepo implements LobsterRepository {
  constructor(private db: Database) {}

  async upsert(profile: PublicProfile, source?: LobsterSource): Promise<LobsterRecord> {
    const [row] = await this.db
      .insert(lobsters)
      .values({
        id: profile.id,
        name: profile.name,
        color: profile.color,
        skills: [...profile.skills],
        bio: profile.bio ?? null,
        avatar: profile.avatar ?? null,
        status: 'online',
        source: source ?? null,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: lobsters.id,
        set: {
          name: profile.name,
          color: profile.color,
          skills: [...profile.skills],
          bio: profile.bio ?? null,
          avatar: profile.avatar ?? null,
          source: source ?? null,
          lastSeen: new Date(),
        },
      })
      .returning();
    return rowToRecord(row);
  }

  async getById(id: string): Promise<LobsterRecord | undefined> {
    const [row] = await this.db.select().from(lobsters).where(eq(lobsters.id, id));
    return row ? rowToRecord(row) : undefined;
  }

  async getAll(): Promise<LobsterRecord[]> {
    const rows = await this.db.select().from(lobsters);
    return rows.map(rowToRecord);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.db.update(lobsters).set({ status }).where(eq(lobsters.id, id));
  }

  async updateLastSeen(id: string): Promise<void> {
    await this.db.update(lobsters).set({ lastSeen: new Date() }).where(eq(lobsters.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(lobsters).where(eq(lobsters.id, id)).returning();
    return result.length > 0;
  }

  async count(): Promise<number> {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(lobsters);
    return Number(result.count);
  }
}
