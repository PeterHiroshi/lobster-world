import type { AuditEvent, AuditEventType } from '@lobster-world/protocol';
import { desc, sql } from 'drizzle-orm';
import type { Database } from '../connection.js';
import { auditLog } from '../schema.js';
import { AUDIT_RING_BUFFER_SIZE } from '../../config.js';

export interface AuditRepository {
  log(eventType: AuditEventType, participants: string[], details: string): Promise<void>;
  getRecent(count?: number): Promise<AuditEvent[]>;
  getAll(): Promise<AuditEvent[]>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

export class InMemoryAuditRepo implements AuditRepository {
  private buffer: AuditEvent[];
  private head = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity: number = AUDIT_RING_BUFFER_SIZE) {
    this.capacity = capacity;
    this.buffer = new Array<AuditEvent>(capacity);
  }

  async log(eventType: AuditEventType, participants: string[], details: string): Promise<void> {
    const event: AuditEvent = { timestamp: Date.now(), eventType, participants, details };
    this.buffer[this.head] = event;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  async getRecent(count: number = 100): Promise<AuditEvent[]> {
    const n = Math.min(count, this.count);
    const result: AuditEvent[] = [];
    for (let i = 0; i < n; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity;
      result.push(this.buffer[idx]);
    }
    return result;
  }

  async getAll(): Promise<AuditEvent[]> {
    return this.getRecent(this.count);
  }

  async clear(): Promise<void> {
    this.head = 0;
    this.count = 0;
  }

  async size(): Promise<number> {
    return this.count;
  }
}

export class PgAuditRepo implements AuditRepository {
  constructor(private db: Database) {}

  async log(eventType: AuditEventType, participants: string[], details: string): Promise<void> {
    await this.db.insert(auditLog).values({
      eventType,
      participants,
      details,
      timestamp: Date.now(),
    });
  }

  async getRecent(count: number = 100): Promise<AuditEvent[]> {
    const rows = await this.db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(count);
    return rows.map((r) => ({
      timestamp: r.timestamp,
      eventType: r.eventType as AuditEventType,
      participants: (r.participants as string[]) ?? [],
      details: r.details,
    }));
  }

  async getAll(): Promise<AuditEvent[]> {
    const rows = await this.db.select().from(auditLog).orderBy(desc(auditLog.timestamp));
    return rows.map((r) => ({
      timestamp: r.timestamp,
      eventType: r.eventType as AuditEventType,
      participants: (r.participants as string[]) ?? [],
      details: r.details,
    }));
  }

  async clear(): Promise<void> {
    await this.db.delete(auditLog);
  }

  async size(): Promise<number> {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(auditLog);
    return Number(result.count);
  }
}
