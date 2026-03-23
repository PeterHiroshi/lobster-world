import { describe, it, expect, beforeEach } from 'vitest';
import type { LobsterState } from '@lobster-world/protocol';
import { SceneEngine } from '../../src/engine/scene.js';
import { SceneEventBatcher } from '../../src/engine/event-batcher.js';
import { ConnectionPool } from '../../src/ws/connection-pool.js';
import type WebSocket from 'ws';

function makeLobster(id: string, x = 0, z = 0): LobsterState {
  return {
    id,
    profile: { id, name: `Lobster ${id}`, color: '#ff0000', skills: [] },
    position: { x, y: 0, z },
    rotation: 0,
    animation: 'idle',
    status: 'online',
    mood: 'neutral',
  };
}

function createMockWs(): WebSocket {
  return {
    close: () => {},
    terminate: () => {},
    send: () => {},
    readyState: 1,
    OPEN: 1,
  } as unknown as WebSocket;
}

describe('Performance Benchmarks', () => {
  describe('SceneEngine at scale', () => {
    let engine: SceneEngine;

    beforeEach(() => {
      engine = new SceneEngine();
    });

    it('should handle 200 lobsters joining', () => {
      const start = performance.now();
      for (let i = 0; i < 200; i++) {
        engine.addLobster(makeLobster(`l${i}`, Math.random() * 50, Math.random() * 50));
      }
      const joinTime = performance.now() - start;

      expect(engine.getLobsterCount()).toBe(200);
      expect(joinTime).toBeLessThan(100); // < 100ms for 200 joins
    });

    it('should handle 200 concurrent updates per tick', () => {
      for (let i = 0; i < 200; i++) {
        engine.addLobster(makeLobster(`l${i}`));
      }
      engine.getPendingEvents(); // clear join events

      const start = performance.now();
      for (let i = 0; i < 200; i++) {
        engine.updateLobster(`l${i}`, {
          position: { x: Math.random() * 50, y: 0, z: Math.random() * 50 },
          animation: 'walking',
        });
      }
      const events = engine.getPendingEvents();
      const updateTime = performance.now() - start;

      expect(events).toHaveLength(200);
      expect(updateTime).toBeLessThan(50); // < 50ms for 200 updates + getPendingEvents
    });

    it('should merge multiple updates to same lobster', () => {
      engine.addLobster(makeLobster('l1'));
      engine.getPendingEvents();

      for (let i = 0; i < 100; i++) {
        engine.updateLobster('l1', { position: { x: i, y: 0, z: i } });
      }

      const events = engine.getPendingEvents();
      // All 100 updates should merge into 1 event
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('lobster_update');
    });
  });

  describe('SceneEventBatcher throughput', () => {
    it('should batch 1000 events efficiently', () => {
      let batchCount = 0;
      const batcher = new SceneEventBatcher(() => { batchCount++; }, 100, 50);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        batcher.queueEvent({
          type: 'lobster_update',
          lobsterId: `l${i % 200}`,
          delta: { animation: 'walking' },
        });
      }
      batcher.flush(); // flush remainder
      const batchTime = performance.now() - start;

      // 1000 events / 50 max batch = 20 auto-flushes + 0 remainder
      expect(batchCount).toBe(20);
      expect(batchTime).toBeLessThan(50); // < 50ms for 1000 events
    });
  });

  describe('ConnectionPool at scale', () => {
    it('should handle 200 connections', () => {
      const pool = new ConnectionPool(200);

      const start = performance.now();
      for (let i = 0; i < 200; i++) {
        pool.add(`c${i}`, createMockWs());
      }
      const addTime = performance.now() - start;

      expect(pool.size).toBe(200);
      expect(pool.isFull()).toBe(true);
      expect(addTime).toBeLessThan(50); // < 50ms for 200 adds
    });

    it('should evict LRU when over capacity', () => {
      const pool = new ConnectionPool(100);

      for (let i = 0; i < 100; i++) {
        pool.add(`c${i}`, createMockWs());
      }

      const start = performance.now();
      for (let i = 100; i < 150; i++) {
        pool.add(`c${i}`, createMockWs());
      }
      const evictTime = performance.now() - start;

      expect(pool.size).toBe(100);
      // Oldest 50 should have been evicted
      expect(pool.has('c0')).toBe(false);
      expect(pool.has('c149')).toBe(true);
      expect(evictTime).toBeLessThan(50);
    });
  });

  describe('Memory budget checks', () => {
    it('should keep scene memory under 512MB equivalent for 200 lobsters', () => {
      const engine = new SceneEngine();
      for (let i = 0; i < 200; i++) {
        engine.addLobster(makeLobster(`l${i}`, Math.random() * 50, Math.random() * 50));
      }

      // Rough memory estimate: each lobster ~2KB in JSON
      const scene = engine.getScene();
      const sceneJson = JSON.stringify(scene);
      const sizeBytes = new TextEncoder().encode(sceneJson).length;

      expect(sizeBytes).toBeLessThan(512 * 1024); // < 512KB for scene state
      expect(engine.getLobsterCount()).toBe(200);
    });
  });
});
