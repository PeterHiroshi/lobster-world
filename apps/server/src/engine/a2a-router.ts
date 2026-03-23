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

export class A2ARouter {
  private messages: Map<string, A2AMessage> = new Map();
  private pending: Map<string, A2AMessage[]> = new Map(); // agentId -> pending msgs
  private correlations: Map<string, A2AMessage[]> = new Map(); // correlationId -> chain
  private nextId: number = 1;

  sendMessage(request: A2ASendRequest): A2AMessage {
    this.validateRequest(request);

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

    this.messages.set(message.id, message);

    // Add to pending queues for recipients
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    for (const recipient of recipients) {
      const queue = this.pending.get(recipient) ?? [];
      queue.push(message);
      this.pending.set(recipient, queue);
    }

    // Track correlation chain
    if (message.correlationId) {
      const chain = this.correlations.get(message.correlationId) ?? [];
      chain.push(message);
      this.correlations.set(message.correlationId, chain);
    }

    return message;
  }

  getPending(agentId: string): A2AMessage[] {
    const now = Date.now();
    const queue = this.pending.get(agentId) ?? [];
    // Filter out expired messages
    return queue.filter((m) => {
      const ttlMs = (m.ttl ?? A2A_DEFAULT_TTL_S) * 1000;
      return now - m.timestamp < ttlMs;
    });
  }

  ack(messageId: string, agentId: string): boolean {
    const queue = this.pending.get(agentId);
    if (!queue) return false;

    const idx = queue.findIndex((m) => m.id === messageId);
    if (idx === -1) return false;

    queue.splice(idx, 1);
    if (queue.length === 0) {
      this.pending.delete(agentId);
    }
    return true;
  }

  getCorrelation(correlationId: string): A2AMessage[] {
    return this.correlations.get(correlationId) ?? [];
  }

  getMessage(messageId: string): A2AMessage | undefined {
    return this.messages.get(messageId);
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    // Clean expired messages
    for (const [id, msg] of this.messages) {
      const ttlMs = (msg.ttl ?? A2A_DEFAULT_TTL_S) * 1000;
      if (now - msg.timestamp >= ttlMs) {
        this.messages.delete(id);
        removed++;
      }
    }

    // Clean expired pending
    for (const [agentId, queue] of this.pending) {
      const filtered = queue.filter((m) => {
        const ttlMs = (m.ttl ?? A2A_DEFAULT_TTL_S) * 1000;
        return now - m.timestamp < ttlMs;
      });
      if (filtered.length === 0) {
        this.pending.delete(agentId);
      } else {
        this.pending.set(agentId, filtered);
      }
    }

    // Clean stale correlations
    const corrTimeoutMs = A2A_CORRELATION_TIMEOUT_S * 1000;
    for (const [corrId, chain] of this.correlations) {
      const lastMsg = chain[chain.length - 1];
      if (lastMsg && now - lastMsg.timestamp >= corrTimeoutMs) {
        this.correlations.delete(corrId);
      }
    }

    return removed;
  }

  getStats(): A2AStats {
    const messagesByType: Partial<Record<A2AMessageType, number>> = {};
    for (const msg of this.messages.values()) {
      messagesByType[msg.type] = (messagesByType[msg.type] ?? 0) + 1;
    }

    let pendingCount = 0;
    for (const queue of this.pending.values()) {
      pendingCount += queue.length;
    }

    return {
      totalMessages: this.messages.size,
      pendingMessages: pendingCount,
      activeCorrelations: this.correlations.size,
      messagesByType,
    };
  }

  private validateRequest(request: A2ASendRequest): void {
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

    // Check pending queue limits for recipients
    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    for (const recipient of recipients) {
      const queue = this.pending.get(recipient) ?? [];
      if (queue.length >= A2A_MAX_PENDING_PER_AGENT) {
        throw new Error(`Pending queue full for agent ${recipient}`);
      }
    }
  }
}
