import { describe, it, expect, beforeEach } from 'vitest';
import type { LobsterState } from '@lobster-world/protocol';
import { ScenePartitioner } from '../src/engine/ScenePartitioner';

function makeLobster(id: string, x: number, z: number): LobsterState {
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

describe('ScenePartitioner', () => {
  let partitioner: ScenePartitioner;

  beforeEach(() => {
    partitioner = new ScenePartitioner(5);
  });

  describe('updateLobster / removeLobster', () => {
    it('should track lobster count', () => {
      expect(partitioner.getLobsterCount()).toBe(0);
      partitioner.updateLobster(makeLobster('l1', 0, 0));
      expect(partitioner.getLobsterCount()).toBe(1);
    });

    it('should remove lobster', () => {
      partitioner.updateLobster(makeLobster('l1', 0, 0));
      partitioner.removeLobster('l1');
      expect(partitioner.getLobsterCount()).toBe(0);
    });

    it('should handle removing non-existent lobster', () => {
      expect(() => partitioner.removeLobster('unknown')).not.toThrow();
    });

    it('should move lobster between cells when position changes', () => {
      partitioner.updateLobster(makeLobster('l1', 0, 0));
      expect(partitioner.getCellCount()).toBe(1);

      // Move to a different cell (cellSize=5, so x=6 is cell 1)
      partitioner.updateLobster(makeLobster('l1', 6, 0));
      expect(partitioner.getLobsterCount()).toBe(1);
      // Old cell should be cleaned up (empty)
      expect(partitioner.getCellCount()).toBe(1);
    });

    it('should not change cell when position stays in same cell', () => {
      partitioner.updateLobster(makeLobster('l1', 1, 1));
      partitioner.updateLobster(makeLobster('l1', 2, 2));
      expect(partitioner.getCellCount()).toBe(1);
      expect(partitioner.getLobsterCount()).toBe(1);
    });
  });

  describe('getNearbyLobsterIds', () => {
    it('should return lobsters in same cell', () => {
      partitioner.updateLobster(makeLobster('l1', 1, 1));
      partitioner.updateLobster(makeLobster('l2', 2, 2));

      const nearby = partitioner.getNearbyLobsterIds('l1');
      expect(nearby).toContain('l2');
      expect(nearby).not.toContain('l1');
    });

    it('should return lobsters in adjacent cells', () => {
      partitioner.updateLobster(makeLobster('l1', 2, 2));
      // Cell boundary: l2 in adjacent cell (cellSize=5, x=6 is cell 1)
      partitioner.updateLobster(makeLobster('l2', 6, 2));

      const nearby = partitioner.getNearbyLobsterIds('l1');
      expect(nearby).toContain('l2');
    });

    it('should NOT return lobsters in distant cells', () => {
      partitioner.updateLobster(makeLobster('l1', 0, 0));
      // Far away: 2+ cells distance
      partitioner.updateLobster(makeLobster('l2', 20, 20));

      const nearby = partitioner.getNearbyLobsterIds('l1');
      expect(nearby).not.toContain('l2');
    });

    it('should return empty array for unknown lobster', () => {
      expect(partitioner.getNearbyLobsterIds('unknown')).toEqual([]);
    });
  });

  describe('getLobsterIdsInRadius', () => {
    it('should return lobsters within radius', () => {
      const l1 = makeLobster('l1', 0, 0);
      const l2 = makeLobster('l2', 3, 4); // distance = 5
      const lobsters = { l1, l2 };
      partitioner.updateLobster(l1);
      partitioner.updateLobster(l2);

      const ids = partitioner.getLobsterIdsInRadius({ x: 0, y: 0, z: 0 }, 6, lobsters);
      expect(ids).toContain('l1');
      expect(ids).toContain('l2');
    });

    it('should exclude lobsters outside radius', () => {
      const l1 = makeLobster('l1', 0, 0);
      const l2 = makeLobster('l2', 10, 10); // distance ~14
      const lobsters = { l1, l2 };
      partitioner.updateLobster(l1);
      partitioner.updateLobster(l2);

      const ids = partitioner.getLobsterIdsInRadius({ x: 0, y: 0, z: 0 }, 5, lobsters);
      expect(ids).toContain('l1');
      expect(ids).not.toContain('l2');
    });
  });

  describe('rebuild', () => {
    it('should rebuild grid from lobster record', () => {
      const lobsters: Record<string, LobsterState> = {
        l1: makeLobster('l1', 0, 0),
        l2: makeLobster('l2', 6, 6),
        l3: makeLobster('l3', 12, 12),
      };

      partitioner.rebuild(lobsters);
      expect(partitioner.getLobsterCount()).toBe(3);
      expect(partitioner.getCellCount()).toBe(3); // each in different cell
    });

    it('should clear previous state on rebuild', () => {
      partitioner.updateLobster(makeLobster('old', 0, 0));
      partitioner.rebuild({ l1: makeLobster('l1', 5, 5) });
      expect(partitioner.getLobsterCount()).toBe(1);
      expect(partitioner.getNearbyLobsterIds('old')).toEqual([]);
    });
  });

  describe('scaling', () => {
    it('should handle 200 lobsters efficiently', () => {
      const lobsters: Record<string, LobsterState> = {};
      for (let i = 0; i < 200; i++) {
        const l = makeLobster(`l${i}`, Math.random() * 50, Math.random() * 50);
        lobsters[l.id] = l;
        partitioner.updateLobster(l);
      }

      expect(partitioner.getLobsterCount()).toBe(200);

      // Nearby lookup should work
      const nearby = partitioner.getNearbyLobsterIds('l0');
      expect(nearby.length).toBeLessThan(200);
    });
  });
});
