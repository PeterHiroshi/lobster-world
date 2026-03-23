import { describe, it, expect, vi } from 'vitest';
import type { LobsterState, RenderEvent } from '@lobster-world/protocol';
import { ScenePartitioner } from '../src/engine/ScenePartitioner';
import { useWorldStore } from '../src/store/useWorldStore';

// Mock audio
vi.mock('../src/lib/audio', () => ({
  playChatPing: vi.fn(),
  playJoinSound: vi.fn(),
  playTypingClick: vi.fn(),
  setMuted: vi.fn(),
  getMuted: () => true,
}));

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

describe('Web Performance Benchmarks', () => {
  describe('ScenePartitioner at scale', () => {
    it('should rebuild 200 lobsters under 10ms', () => {
      const partitioner = new ScenePartitioner(5);
      const lobsters: Record<string, LobsterState> = {};
      for (let i = 0; i < 200; i++) {
        lobsters[`l${i}`] = makeLobster(`l${i}`, Math.random() * 50, Math.random() * 50);
      }

      const start = performance.now();
      partitioner.rebuild(lobsters);
      const rebuildTime = performance.now() - start;

      expect(partitioner.getLobsterCount()).toBe(200);
      expect(rebuildTime).toBeLessThan(10);
    });

    it('should perform 200 nearby lookups under 20ms', () => {
      const partitioner = new ScenePartitioner(5);
      const lobsters: Record<string, LobsterState> = {};
      for (let i = 0; i < 200; i++) {
        const l = makeLobster(`l${i}`, Math.random() * 50, Math.random() * 50);
        lobsters[l.id] = l;
        partitioner.updateLobster(l);
      }

      const start = performance.now();
      for (let i = 0; i < 200; i++) {
        partitioner.getNearbyLobsterIds(`l${i}`);
      }
      const lookupTime = performance.now() - start;

      expect(lookupTime).toBeLessThan(20);
    });

    it('should handle rapid position updates', () => {
      const partitioner = new ScenePartitioner(5);
      for (let i = 0; i < 200; i++) {
        partitioner.updateLobster(makeLobster(`l${i}`, i % 10, Math.floor(i / 10)));
      }

      const start = performance.now();
      for (let round = 0; round < 10; round++) {
        for (let i = 0; i < 200; i++) {
          partitioner.updateLobster(
            makeLobster(`l${i}`, Math.random() * 50, Math.random() * 50),
          );
        }
      }
      const updateTime = performance.now() - start;

      // 2000 position updates should complete quickly
      expect(updateTime).toBeLessThan(50);
    });
  });

  describe('Store batch event processing', () => {
    it('should process a batch of 100 updates under 50ms', () => {
      // Setup initial lobsters
      const lobsters: Record<string, LobsterState> = {};
      for (let i = 0; i < 100; i++) {
        lobsters[`l${i}`] = makeLobster(`l${i}`, i, 0);
      }
      useWorldStore.setState({ lobsters, stats: { lobsterCount: 100, realLobsterCount: 0, demoLobsterCount: 100, activeDialogues: 0, totalMessages: 0 } });

      // Build batch of 100 update events
      const updates: RenderEvent[] = [];
      for (let i = 0; i < 100; i++) {
        updates.push({
          type: 'lobster_update',
          lobsterId: `l${i}`,
          delta: { position: { x: Math.random() * 50, y: 0, z: Math.random() * 50 } },
        });
      }

      const start = performance.now();
      useWorldStore.getState().handleRenderEvent({
        type: 'render_batch',
        events: updates,
      });
      const batchTime = performance.now() - start;

      expect(batchTime).toBeLessThan(50);
      // Verify all updates applied
      const state = useWorldStore.getState();
      expect(Object.keys(state.lobsters)).toHaveLength(100);
    });
  });
});
