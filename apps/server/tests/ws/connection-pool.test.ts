import { describe, it, expect, vi, beforeEach } from 'vitest';
import type WebSocket from 'ws';
import { ConnectionPool } from '../../src/ws/connection-pool.js';

function createMockWs(): WebSocket {
  return {
    close: vi.fn(),
    terminate: vi.fn(),
    readyState: 1,
    OPEN: 1,
  } as unknown as WebSocket;
}

describe('ConnectionPool', () => {
  let pool: ConnectionPool;

  beforeEach(() => {
    pool = new ConnectionPool(3);
  });

  describe('add / get / remove', () => {
    it('should add and retrieve a connection', () => {
      const ws = createMockWs();
      pool.add('c1', ws);

      const conn = pool.get('c1');
      expect(conn).toBeDefined();
      expect(conn!.ws).toBe(ws);
      expect(conn!.lastActivity).toBeTypeOf('number');
    });

    it('should return undefined for unknown id', () => {
      expect(pool.get('unknown')).toBeUndefined();
    });

    it('should remove a connection', () => {
      pool.add('c1', createMockWs());
      pool.remove('c1');
      expect(pool.get('c1')).toBeUndefined();
      expect(pool.size).toBe(0);
    });

    it('should report size correctly', () => {
      expect(pool.size).toBe(0);
      pool.add('c1', createMockWs());
      expect(pool.size).toBe(1);
      pool.add('c2', createMockWs());
      expect(pool.size).toBe(2);
    });
  });

  describe('has / isFull', () => {
    it('should report has correctly', () => {
      expect(pool.has('c1')).toBe(false);
      pool.add('c1', createMockWs());
      expect(pool.has('c1')).toBe(true);
    });

    it('should report full when at capacity', () => {
      expect(pool.isFull()).toBe(false);
      pool.add('c1', createMockWs());
      pool.add('c2', createMockWs());
      pool.add('c3', createMockWs());
      expect(pool.isFull()).toBe(true);
    });

    it('should expose capacity', () => {
      expect(pool.capacity).toBe(3);
    });
  });

  describe('touch', () => {
    it('should update lastActivity timestamp', () => {
      pool.add('c1', createMockWs());
      const before = pool.get('c1')!.lastActivity;

      // Small delay to ensure different timestamp
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);
      pool.touch('c1');
      const after = pool.get('c1')!.lastActivity;
      expect(after).toBeGreaterThan(before);
      vi.useRealTimers();
    });

    it('should be a no-op for unknown id', () => {
      expect(() => pool.touch('unknown')).not.toThrow();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when full', () => {
      vi.useFakeTimers();

      const ws1 = createMockWs();
      pool.add('c1', ws1);
      vi.advanceTimersByTime(10);

      const ws2 = createMockWs();
      pool.add('c2', ws2);
      vi.advanceTimersByTime(10);

      const ws3 = createMockWs();
      pool.add('c3', ws3);
      vi.advanceTimersByTime(10);

      // Pool is full. Adding c4 should evict c1 (oldest).
      const ws4 = createMockWs();
      const evicted = pool.add('c4', ws4);

      expect(evicted).toBe(true);
      expect(ws1.close).toHaveBeenCalled();
      expect(pool.has('c1')).toBe(false);
      expect(pool.has('c4')).toBe(true);
      expect(pool.size).toBe(3);

      vi.useRealTimers();
    });

    it('should evict based on lastActivity not add order', () => {
      vi.useFakeTimers();

      pool.add('c1', createMockWs());
      vi.advanceTimersByTime(10);
      pool.add('c2', createMockWs());
      vi.advanceTimersByTime(10);
      pool.add('c3', createMockWs());
      vi.advanceTimersByTime(10);

      // Touch c1 to make it recently used
      pool.touch('c1');
      vi.advanceTimersByTime(10);

      // c2 is now oldest by lastActivity
      const ws4 = createMockWs();
      pool.add('c4', ws4);

      expect(pool.has('c2')).toBe(false);
      expect(pool.has('c1')).toBe(true);
      expect(pool.has('c3')).toBe(true);
      expect(pool.has('c4')).toBe(true);

      vi.useRealTimers();
    });

    it('should not evict when updating existing connection', () => {
      const ws1 = createMockWs();
      pool.add('c1', ws1);
      pool.add('c2', createMockWs());
      pool.add('c3', createMockWs());

      // Re-adding c1 with new ws should not evict
      const wsNew = createMockWs();
      const evicted = pool.add('c1', wsNew);

      expect(evicted).toBe(false);
      expect(pool.size).toBe(3);
      expect(pool.get('c1')!.ws).toBe(wsNew);
    });

    it('should return false when no eviction needed', () => {
      const evicted = pool.add('c1', createMockWs());
      expect(evicted).toBe(false);
    });
  });
});
