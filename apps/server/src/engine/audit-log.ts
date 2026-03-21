import type { AuditEvent, AuditEventType } from '@lobster-world/protocol';
import { AUDIT_RING_BUFFER_SIZE } from '../config.js';

export class AuditLog {
  private buffer: AuditEvent[];
  private head: number = 0;
  private count: number = 0;
  private readonly capacity: number;

  constructor(capacity: number = AUDIT_RING_BUFFER_SIZE) {
    this.capacity = capacity;
    this.buffer = new Array<AuditEvent>(capacity);
  }

  log(eventType: AuditEventType, participants: string[], details: string): void {
    const event: AuditEvent = {
      timestamp: Date.now(),
      eventType,
      participants,
      details,
    };
    this.buffer[this.head] = event;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  getRecent(count: number = 100): AuditEvent[] {
    const n = Math.min(count, this.count);
    const result: AuditEvent[] = [];
    for (let i = 0; i < n; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity;
      result.push(this.buffer[idx]);
    }
    return result;
  }

  getAll(): AuditEvent[] {
    return this.getRecent(this.count);
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }

  get size(): number {
    return this.count;
  }
}
