import type { A2AMessage, A2AMessageType } from '@lobster-world/protocol';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../connection.js';
import { a2aMessages } from '../schema.js';

export interface A2ARepository {
  save(message: A2AMessage): Promise<void>;
  getById(id: string): Promise<A2AMessage | undefined>;
  getByCorrelation(correlationId: string): Promise<A2AMessage[]>;
  getPendingForAgent(agentId: string): Promise<A2AMessage[]>;
  removePendingForAgent(messageId: string, agentId: string): Promise<boolean>;
  getAll(): Promise<A2AMessage[]>;
  deleteExpired(nowMs: number, defaultTtlS: number): Promise<number>;
  count(): Promise<number>;
}

export class InMemoryA2ARepo implements A2ARepository {
  private messages: Map<string, A2AMessage> = new Map();
  private pending: Map<string, A2AMessage[]> = new Map();
  private correlations: Map<string, A2AMessage[]> = new Map();

  async save(message: A2AMessage): Promise<void> {
    this.messages.set(message.id, message);

    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    for (const recipient of recipients) {
      const queue = this.pending.get(recipient) ?? [];
      queue.push(message);
      this.pending.set(recipient, queue);
    }

    if (message.correlationId) {
      const chain = this.correlations.get(message.correlationId) ?? [];
      chain.push(message);
      this.correlations.set(message.correlationId, chain);
    }
  }

  async getById(id: string): Promise<A2AMessage | undefined> {
    return this.messages.get(id);
  }

  async getByCorrelation(correlationId: string): Promise<A2AMessage[]> {
    return this.correlations.get(correlationId) ?? [];
  }

  async getPendingForAgent(agentId: string): Promise<A2AMessage[]> {
    return this.pending.get(agentId) ?? [];
  }

  async removePendingForAgent(messageId: string, agentId: string): Promise<boolean> {
    const queue = this.pending.get(agentId);
    if (!queue) return false;
    const idx = queue.findIndex((m) => m.id === messageId);
    if (idx === -1) return false;
    queue.splice(idx, 1);
    if (queue.length === 0) this.pending.delete(agentId);
    return true;
  }

  async getAll(): Promise<A2AMessage[]> {
    return [...this.messages.values()];
  }

  async deleteExpired(nowMs: number, defaultTtlS: number): Promise<number> {
    let removed = 0;

    for (const [id, msg] of this.messages) {
      const ttlMs = (msg.ttl ?? defaultTtlS) * 1000;
      if (nowMs - msg.timestamp >= ttlMs) {
        this.messages.delete(id);
        removed++;
      }
    }

    for (const [agentId, queue] of this.pending) {
      const filtered = queue.filter((m) => {
        const ttlMs = (m.ttl ?? defaultTtlS) * 1000;
        return nowMs - m.timestamp < ttlMs;
      });
      if (filtered.length === 0) {
        this.pending.delete(agentId);
      } else {
        this.pending.set(agentId, filtered);
      }
    }

    for (const [corrId, chain] of this.correlations) {
      const lastMsg = chain[chain.length - 1];
      if (lastMsg && nowMs - lastMsg.timestamp >= defaultTtlS * 1000) {
        this.correlations.delete(corrId);
      }
    }

    return removed;
  }

  async count(): Promise<number> {
    return this.messages.size;
  }
}

function rowToMessage(row: typeof a2aMessages.$inferSelect): A2AMessage {
  const toIds = row.toIds as string[];
  return {
    id: row.id,
    type: row.type as A2AMessageType,
    from: row.fromId,
    to: toIds.length === 1 ? toIds[0] : toIds,
    payload: row.payload as A2AMessage['payload'],
    timestamp: row.timestamp,
    correlationId: row.correlationId ?? undefined,
    ttl: row.ttl ?? undefined,
  };
}

export class PgA2ARepo implements A2ARepository {
  constructor(private db: Database) {}

  async save(message: A2AMessage): Promise<void> {
    const toIds = Array.isArray(message.to) ? message.to : [message.to];
    await this.db.insert(a2aMessages).values({
      id: message.id,
      type: message.type,
      fromId: message.from,
      toIds,
      payload: message.payload,
      correlationId: message.correlationId ?? null,
      ttl: message.ttl ?? null,
      timestamp: message.timestamp,
    });
  }

  async getById(id: string): Promise<A2AMessage | undefined> {
    const [row] = await this.db.select().from(a2aMessages).where(eq(a2aMessages.id, id));
    return row ? rowToMessage(row) : undefined;
  }

  async getByCorrelation(correlationId: string): Promise<A2AMessage[]> {
    const rows = await this.db.select().from(a2aMessages).where(eq(a2aMessages.correlationId, correlationId));
    return rows.map(rowToMessage);
  }

  async getPendingForAgent(agentId: string): Promise<A2AMessage[]> {
    const rows = await this.db.select().from(a2aMessages).where(
      sql`${a2aMessages.toIds}::jsonb @> ${JSON.stringify([agentId])}::jsonb`,
    );
    return rows.map(rowToMessage);
  }

  async removePendingForAgent(messageId: string, agentId: string): Promise<boolean> {
    // In PG, we remove the agent from the toIds array
    const [row] = await this.db.select().from(a2aMessages).where(eq(a2aMessages.id, messageId));
    if (!row) return false;
    const toIds = (row.toIds as string[]).filter((id) => id !== agentId);
    if (toIds.length === 0) {
      await this.db.delete(a2aMessages).where(eq(a2aMessages.id, messageId));
    } else {
      await this.db.update(a2aMessages).set({ toIds }).where(eq(a2aMessages.id, messageId));
    }
    return true;
  }

  async getAll(): Promise<A2AMessage[]> {
    const rows = await this.db.select().from(a2aMessages);
    return rows.map(rowToMessage);
  }

  async deleteExpired(nowMs: number, defaultTtlS: number): Promise<number> {
    // Use SQL to delete expired messages in a single query
    // Messages are expired when: nowMs - timestamp >= COALESCE(ttl, defaultTtlS) * 1000
    const result = await this.db
      .delete(a2aMessages)
      .where(
        sql`${nowMs} - ${a2aMessages.timestamp} >= COALESCE(${a2aMessages.ttl}, ${defaultTtlS}) * 1000`,
      )
      .returning();
    return result.length;
  }

  async count(): Promise<number> {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(a2aMessages);
    return Number(result.count);
  }
}
