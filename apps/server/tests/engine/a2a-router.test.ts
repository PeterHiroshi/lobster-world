import { describe, it, expect, beforeEach } from 'vitest';
import { A2ARouter } from '../../src/engine/a2a-router.js';
import type { A2ASendRequest } from '@lobster-world/protocol';
import {
  A2A_DEFAULT_TTL_S,
  A2A_MAX_MULTICAST,
  A2A_MAX_PAYLOAD_BYTES,
  A2A_MAX_PENDING_PER_AGENT,
} from '@lobster-world/protocol';

function makeRequest(overrides?: Partial<A2ASendRequest>): A2ASendRequest {
  return {
    type: 'task_delegate',
    from: 'agent-a',
    to: 'agent-b',
    payload: {
      taskId: 'task-1',
      title: 'Implement feature',
      description: 'Build the thing',
      priority: 'medium',
    },
    ...overrides,
  };
}

describe('A2ARouter', () => {
  let router: A2ARouter;

  beforeEach(() => {
    router = new A2ARouter();
  });

  // --- sendMessage ---

  describe('sendMessage', () => {
    it('creates a message with auto-generated id and timestamp', async () => {
      const msg = await router.sendMessage(makeRequest());
      expect(msg.id).toBe('a2a-1');
      expect(msg.type).toBe('task_delegate');
      expect(msg.from).toBe('agent-a');
      expect(msg.to).toBe('agent-b');
      expect(msg.timestamp).toBeTypeOf('number');
      expect(msg.ttl).toBe(A2A_DEFAULT_TTL_S);
    });

    it('increments message IDs', async () => {
      const m1 = await router.sendMessage(makeRequest());
      const m2 = await router.sendMessage(makeRequest());
      expect(m1.id).toBe('a2a-1');
      expect(m2.id).toBe('a2a-2');
    });

    it('preserves correlationId', async () => {
      const msg = await router.sendMessage(makeRequest({ correlationId: 'corr-1' }));
      expect(msg.correlationId).toBe('corr-1');
    });

    it('uses custom ttl', async () => {
      const msg = await router.sendMessage(makeRequest({ ttl: 60 }));
      expect(msg.ttl).toBe(60);
    });

    it('adds message to pending queue for recipient', async () => {
      await router.sendMessage(makeRequest());
      const pending = await router.getPending('agent-b');
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('task_delegate');
    });

    it('supports multicast to multiple recipients', async () => {
      await router.sendMessage(makeRequest({ to: ['agent-b', 'agent-c'] }));
      expect(await router.getPending('agent-b')).toHaveLength(1);
      expect(await router.getPending('agent-c')).toHaveLength(1);
    });

    it('tracks correlation chain', async () => {
      await router.sendMessage(makeRequest({ correlationId: 'corr-1' }));
      await router.sendMessage(makeRequest({
        type: 'task_accept',
        from: 'agent-b',
        to: 'agent-a',
        payload: { taskId: 'task-1' },
        correlationId: 'corr-1',
      }));
      const chain = await router.getCorrelation('corr-1');
      expect(chain).toHaveLength(2);
      expect(chain[0].type).toBe('task_delegate');
      expect(chain[1].type).toBe('task_accept');
    });
  });

  // --- Validation ---

  describe('validation', () => {
    it('rejects empty from', async () => {
      await expect(router.sendMessage(makeRequest({ from: '' }))).rejects.toThrow('from is required');
    });

    it('rejects empty to', async () => {
      await expect(router.sendMessage(makeRequest({ to: [] }))).rejects.toThrow('to is required');
    });

    it('rejects multicast exceeding limit', async () => {
      const to = Array.from({ length: A2A_MAX_MULTICAST + 1 }, (_, i) => `agent-${i}`);
      await expect(router.sendMessage(makeRequest({ to }))).rejects.toThrow('Multicast limit exceeded');
    });

    it('rejects oversized payload', async () => {
      const bigPayload = {
        taskId: 'task-1',
        title: 'x'.repeat(A2A_MAX_PAYLOAD_BYTES),
        description: 'too big',
        priority: 'medium' as const,
      };
      await expect(router.sendMessage(makeRequest({ payload: bigPayload }))).rejects.toThrow('Payload too large');
    });

    it('rejects when pending queue is full', async () => {
      for (let i = 0; i < A2A_MAX_PENDING_PER_AGENT; i++) {
        await router.sendMessage(makeRequest({ from: `sender-${i}` }));
      }
      await expect(router.sendMessage(makeRequest())).rejects.toThrow('Pending queue full');
    });
  });

  // --- getPending ---

  describe('getPending', () => {
    it('returns empty array for unknown agent', async () => {
      expect(await router.getPending('unknown')).toEqual([]);
    });

    it('filters out expired messages', async () => {
      await router.sendMessage(makeRequest({ ttl: 0 }));
      // TTL=0 means 0 seconds, so immediately expired
      // Need to wait at least 1ms
      const pending = await router.getPending('agent-b');
      // With ttl=0, 0*1000=0ms, so now - timestamp >= 0 is always true after the same tick
      // Actually now - timestamp < 0 is false when they're equal
      // The check is now - timestamp < ttlMs where ttlMs = 0, so it filters everything
      expect(pending).toHaveLength(0);
    });
  });

  // --- ack ---

  describe('ack', () => {
    it('removes message from pending queue', async () => {
      const msg = await router.sendMessage(makeRequest());
      expect(await router.ack(msg.id, 'agent-b')).toBe(true);
      expect(await router.getPending('agent-b')).toHaveLength(0);
    });

    it('returns false for unknown agent', async () => {
      expect(await router.ack('a2a-1', 'unknown')).toBe(false);
    });

    it('returns false for unknown message', async () => {
      await router.sendMessage(makeRequest());
      expect(await router.ack('a2a-999', 'agent-b')).toBe(false);
    });

    it('cleans up empty pending map entries', async () => {
      const msg = await router.sendMessage(makeRequest());
      await router.ack(msg.id, 'agent-b');
      // Internal cleanup: pending map should not have the key
      expect((await router.getStats()).pendingMessages).toBe(0);
    });
  });

  // --- getMessage ---

  describe('getMessage', () => {
    it('retrieves message by id', async () => {
      const msg = await router.sendMessage(makeRequest());
      expect(await router.getMessage(msg.id)).toBe(msg);
    });

    it('returns undefined for unknown id', async () => {
      expect(await router.getMessage('a2a-999')).toBeUndefined();
    });
  });

  // --- getCorrelation ---

  describe('getCorrelation', () => {
    it('returns empty for unknown correlation', async () => {
      expect(await router.getCorrelation('unknown')).toEqual([]);
    });
  });

  // --- cleanup ---

  describe('cleanup', () => {
    it('removes expired messages', async () => {
      await router.sendMessage(makeRequest({ ttl: 0 }));
      // Message with ttl=0 is immediately expired
      const removed = await router.cleanup();
      expect(removed).toBe(1);
      expect((await router.getStats()).totalMessages).toBe(0);
    });

    it('keeps non-expired messages', async () => {
      await router.sendMessage(makeRequest({ ttl: 3600 }));
      const removed = await router.cleanup();
      expect(removed).toBe(0);
      expect((await router.getStats()).totalMessages).toBe(1);
    });

    it('cleans expired pending entries', async () => {
      await router.sendMessage(makeRequest({ ttl: 0 }));
      await router.cleanup();
      expect(await router.getPending('agent-b')).toHaveLength(0);
    });
  });

  // --- getStats ---

  describe('getStats', () => {
    it('returns zeroes when empty', async () => {
      const stats = await router.getStats();
      expect(stats.totalMessages).toBe(0);
      expect(stats.pendingMessages).toBe(0);
      expect(stats.activeCorrelations).toBe(0);
      expect(stats.messagesByType).toEqual({});
    });

    it('counts messages by type', async () => {
      await router.sendMessage(makeRequest());
      await router.sendMessage(makeRequest({ type: 'ping', payload: {} }));
      await router.sendMessage(makeRequest());
      const stats = await router.getStats();
      expect(stats.totalMessages).toBe(3);
      expect(stats.messagesByType.task_delegate).toBe(2);
      expect(stats.messagesByType.ping).toBe(1);
    });

    it('counts pending messages across agents', async () => {
      await router.sendMessage(makeRequest({ to: ['agent-b', 'agent-c'] }));
      const stats = await router.getStats();
      expect(stats.pendingMessages).toBe(2);
    });

    it('counts active correlations', async () => {
      await router.sendMessage(makeRequest({ correlationId: 'corr-1' }));
      await router.sendMessage(makeRequest({ correlationId: 'corr-2' }));
      const stats = await router.getStats();
      expect(stats.activeCorrelations).toBe(2);
    });
  });
});
