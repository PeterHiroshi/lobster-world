import { describe, it, expect, beforeEach } from 'vitest';
import { SceneEngine } from '../src/engine/scene.js';
import type { LobsterState, RenderEvent } from '@lobster-world/protocol';
import { MAX_LOBSTERS_PER_SCENE } from '@lobster-world/protocol';

function makeLobster(id: string, overrides?: Partial<LobsterState>): LobsterState {
  return {
    id,
    profile: {
      id,
      name: `Lobster ${id}`,
      color: '#ff0000',
      skills: ['typescript'],
    },
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    animation: 'idle',
    status: 'online',
    mood: 'neutral',
    ...overrides,
  };
}

describe('SceneEngine', () => {
  let engine: SceneEngine;

  beforeEach(() => {
    engine = new SceneEngine();
  });

  describe('initialization', () => {
    it('should initialize with default scene objects', () => {
      const scene = engine.getScene();
      expect(scene.id).toBe('office-main');
      expect(scene.name).toBe('Virtual Office');
      expect(scene.type).toBe('office');
      expect(scene.capacity).toBe(MAX_LOBSTERS_PER_SCENE);
      expect(scene.objects.length).toBeGreaterThanOrEqual(4);

      const types = scene.objects.map((o) => o.type);
      expect(types.filter((t) => t === 'desk').length).toBeGreaterThanOrEqual(3);
      expect(types).toContain('coffee');
      expect(types).toContain('whiteboard');
    });

    it('should start with no lobsters', () => {
      expect(engine.getLobsterCount()).toBe(0);
      expect(Object.keys(engine.getScene().lobsters)).toHaveLength(0);
    });
  });

  describe('addLobster', () => {
    it('should add a lobster to the scene', () => {
      const lobster = makeLobster('lob-1');
      engine.addLobster(lobster);

      expect(engine.getLobster('lob-1')).toEqual(lobster);
      expect(engine.getLobsterCount()).toBe(1);
      expect(engine.getScene().lobsters['lob-1']).toEqual(lobster);
    });

    it('should generate a lobster_join event', () => {
      const lobster = makeLobster('lob-1');
      engine.addLobster(lobster);

      const events = engine.getPendingEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'lobster_join', lobster });
    });
  });

  describe('removeLobster', () => {
    it('should remove a lobster from the scene', () => {
      const lobster = makeLobster('lob-1');
      engine.addLobster(lobster);
      engine.getPendingEvents(); // clear

      engine.removeLobster('lob-1');

      expect(engine.getLobster('lob-1')).toBeUndefined();
      expect(engine.getLobsterCount()).toBe(0);
    });

    it('should generate a lobster_leave event', () => {
      const lobster = makeLobster('lob-1');
      engine.addLobster(lobster);
      engine.getPendingEvents(); // clear

      engine.removeLobster('lob-1');

      const events = engine.getPendingEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'lobster_leave', lobsterId: 'lob-1' });
    });
  });

  describe('updateLobster', () => {
    it('should update the lobster state in the scene', () => {
      engine.addLobster(makeLobster('lob-1'));
      engine.getPendingEvents(); // clear

      engine.updateLobster('lob-1', { animation: 'walking', mood: 'happy' });

      const lobster = engine.getLobster('lob-1');
      expect(lobster?.animation).toBe('walking');
      expect(lobster?.mood).toBe('happy');
    });

    it('should generate a lobster_update event with delta', () => {
      engine.addLobster(makeLobster('lob-1'));
      engine.getPendingEvents(); // clear

      engine.updateLobster('lob-1', { animation: 'walking' });

      const events = engine.getPendingEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'lobster_update',
        lobsterId: 'lob-1',
        delta: { animation: 'walking' },
      });
    });

    it('should silently ignore updates for non-existent lobsters', () => {
      engine.updateLobster('nonexistent', { animation: 'walking' });
      const events = engine.getPendingEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('getPendingEvents', () => {
    it('should return all pending events and clear them', () => {
      engine.addLobster(makeLobster('lob-1'));
      engine.addLobster(makeLobster('lob-2'));

      const events = engine.getPendingEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({ type: 'lobster_join' });
      expect(events[1]).toMatchObject({ type: 'lobster_join' });
    });

    it('should return empty array on second call', () => {
      engine.addLobster(makeLobster('lob-1'));
      engine.getPendingEvents(); // first call

      const events = engine.getPendingEvents(); // second call
      expect(events).toHaveLength(0);
    });

    it('should return joins, leaves, and updates in order', () => {
      engine.addLobster(makeLobster('lob-1'));
      engine.getPendingEvents(); // clear

      engine.addLobster(makeLobster('lob-2'));
      engine.removeLobster('lob-1');
      engine.updateLobster('lob-2', { mood: 'excited' });

      const events = engine.getPendingEvents();
      const types = events.map((e) => e.type);
      expect(types).toContain('lobster_join');
      expect(types).toContain('lobster_leave');
      expect(types).toContain('lobster_update');
    });
  });

  describe('accumulated deltas', () => {
    it('should merge multiple updates to the same lobster into a single delta', () => {
      engine.addLobster(makeLobster('lob-1'));
      engine.getPendingEvents(); // clear

      engine.updateLobster('lob-1', { animation: 'walking' });
      engine.updateLobster('lob-1', { mood: 'happy' });
      engine.updateLobster('lob-1', { position: { x: 1, y: 0, z: 1 } });

      const events = engine.getPendingEvents();
      const updateEvents = events.filter(
        (e): e is Extract<RenderEvent, { type: 'lobster_update' }> =>
          e.type === 'lobster_update'
      );
      expect(updateEvents).toHaveLength(1);
      expect(updateEvents[0].delta).toEqual({
        animation: 'walking',
        mood: 'happy',
        position: { x: 1, y: 0, z: 1 },
      });
    });

    it('should overwrite earlier delta fields with later values', () => {
      engine.addLobster(makeLobster('lob-1'));
      engine.getPendingEvents(); // clear

      engine.updateLobster('lob-1', { animation: 'walking' });
      engine.updateLobster('lob-1', { animation: 'chatting' });

      const events = engine.getPendingEvents();
      const updateEvents = events.filter(
        (e): e is Extract<RenderEvent, { type: 'lobster_update' }> =>
          e.type === 'lobster_update'
      );
      expect(updateEvents).toHaveLength(1);
      expect(updateEvents[0].delta).toEqual({ animation: 'chatting' });
    });
  });

  describe('isFull', () => {
    it('should return false when scene is not full', () => {
      expect(engine.isFull()).toBe(false);
      engine.addLobster(makeLobster('lob-1'));
      expect(engine.isFull()).toBe(false);
    });

    it('should return true when scene reaches capacity', () => {
      for (let i = 0; i < MAX_LOBSTERS_PER_SCENE; i++) {
        engine.addLobster(makeLobster(`lob-${i}`));
      }
      expect(engine.isFull()).toBe(true);
      expect(engine.getLobsterCount()).toBe(MAX_LOBSTERS_PER_SCENE);
    });
  });

  describe('getLobster', () => {
    it('should return undefined for non-existent lobster', () => {
      expect(engine.getLobster('nonexistent')).toBeUndefined();
    });

    it('should return the lobster state after adding', () => {
      const lobster = makeLobster('lob-1');
      engine.addLobster(lobster);
      expect(engine.getLobster('lob-1')).toEqual(lobster);
    });
  });
});
