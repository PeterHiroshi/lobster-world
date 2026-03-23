import type {
  A2AMessage,
  A2AMessageType,
  A2ASendRequest,
  A2AStats,
} from '@lobster-world/protocol';
import {
  A2A_DEFAULT_TTL_S,
  A2A_MAX_PAYLOAD_BYTES,
  A2A_MAX_MULTICAST,
  A2A_CORRELATION_TIMEOUT_S,
  A2A_MAX_PENDING_PER_AGENT,
} from '@lobster-world/protocol';
import type { A2ARepository } from '../db/repositories/a2a-repo.js';
import { InMemoryA2ARepo } from '../db/repositories/a2a-repo.js';

export class A2ARouter {
  private repo: A2ARepository;
  private nextId = 1;

  constructor(repo?: A2ARepository) {
    this.repo = repo ?? new InMemoryA2ARepo();
  }

  async sendMessage(request: A2ASendRequest): Promise<A2AMessage> {
    await this.validateRequest(request);

    const message: A2AMessage = {
      id: `a2a-${this.nextId++}`,
      type: request.type,
      from: request.from,
      to: request.to,
      payload: request.payload,
      timestamp: Date.now(),
      correlationId: request.correlationId,
      ttl: request.ttl ?? A2A_DEFAULT_TTL_S,
    };

    await this.repo.save(message);
    return message;
  }

  async getPending(agentId: string): Promise<A2AMessage[]> {
    const now = Date.now();
    const queue = await this.repo.getPendingForAgent(agentId);
    return queue.filter((m) => {
      const ttlMs = (m.ttl ?? A2A_DEFAULT_TTL_S) * 1000;
      return now - m.timestamp < ttlMs;
    });
  }

  async ack(messageId: string, agentId: string): Promise<boolean> {
    return this.repo.removePendingForAgent(messageId, agentId);
  }

  async getCorrelation(correlationId: string): Promise<A2AMessage[]> {
    return this.repo.getByCorrelation(correlationId);
  }

  async getMessage(messageId: string): Promise<A2AMessage | undefined> {
    return this.repo.getById(messageId);
  }

  async cleanup(): Promise<number> {
    return this.repo.deleteExpired(Date.now(), A2A_DEFAULT_TTL_S);
  }

  async getStats(): Promise<A2AStats> {
    const all = await this.repo.getAll();
    const messagesByType: Partial<Record<A2AMessageType, number>> = {};
    for (const msg of all) {
      messagesByType[msg.type] = (messagesByType[msg.type] ?? 0) + 1;
    }

    // Count pending across all known agents
    let pendingCount = 0;
    const seenAgents = new Set<string>();
    for (const msg of all) {
      const recipients = Array.isArray(msg.to) ? msg.to : [msg.to];
      for (const r of recipients) seenAgents.add(r);
    }
    for (const agentId of seenAgents) {
      const pending = await this.repo.getPendingForAgent(agentId);
      pendingCount += pending.length;
    }

    const correlationIds = new Set(all.filter((m) => m.correlationId).map((m) => m.correlationId));

    return {
      totalMessages: all.length,
      pendingMessages: pendingCount,
      activeCorrelations: correlationIds.size,
      messagesByType,
    };
  }

  private async validateRequest(request: A2ASendRequest): Promise<void> {
    if (!request.from) {
      throw new Error('from is required');
    }
    if (!request.to || (Array.isArray(request.to) && request.to.length === 0)) {
      throw new Error('to is required');
    }
    if (Array.isArray(request.to) && request.to.length > A2A_MAX_MULTICAST) {
      throw new Error(`Multicast limit exceeded: max ${A2A_MAX_MULTICAST} recipients`);
    }

    const payloadSize = JSON.stringify(request.payload).length;
    if (payloadSize > A2A_MAX_PAYLOAD_BYTES) {
      throw new Error(`Payload too large: ${payloadSize} bytes (max ${A2A_MAX_PAYLOAD_BYTES})`);
    }

    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    for (const recipient of recipients) {
      const queue = await this.repo.getPendingForAgent(recipient);
      if (queue.length >= A2A_MAX_PENDING_PER_AGENT) {
        throw new Error(`Pending queue full for agent ${recipient}`);
      }
    }
  }
}
