import type { AuditEvent, AuditEventType } from '@lobster-world/protocol';
import type { AuditRepository } from '../db/repositories/audit-repo.js';
import { InMemoryAuditRepo } from '../db/repositories/audit-repo.js';
import { AUDIT_RING_BUFFER_SIZE } from '../config.js';

export class AuditLog {
  private repo: AuditRepository;

  constructor(repoOrCapacity?: AuditRepository | number) {
    if (typeof repoOrCapacity === 'number') {
      this.repo = new InMemoryAuditRepo(repoOrCapacity);
    } else {
      this.repo = repoOrCapacity ?? new InMemoryAuditRepo();
    }
  }

  async log(eventType: AuditEventType, participants: string[], details: string): Promise<void> {
    await this.repo.log(eventType, participants, details);
  }

  async getRecent(count: number = 100): Promise<AuditEvent[]> {
    return this.repo.getRecent(count);
  }

  async getAll(): Promise<AuditEvent[]> {
    return this.repo.getAll();
  }

  async clear(): Promise<void> {
    await this.repo.clear();
  }

  async getSize(): Promise<number> {
    return this.repo.size();
  }

  get size(): number | Promise<number> {
    return this.repo.size();
  }
}
