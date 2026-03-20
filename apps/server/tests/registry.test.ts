import { describe, it, expect, beforeEach } from 'vitest';
import type { PublicProfile } from '@lobster-world/protocol';
import { LobsterRegistry } from '../src/engine/registry.js';

function makeProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id: 'lobster-1',
    name: 'Larry',
    color: '#ff0000',
    skills: ['coding', 'fishing'],
    ...overrides,
  };
}

describe('LobsterRegistry', () => {
  let registry: LobsterRegistry;

  beforeEach(() => {
    registry = new LobsterRegistry();
  });

  describe('register', () => {
    it('returns a LobsterState with correct defaults', () => {
      const profile = makeProfile();
      const state = registry.register(profile, 'token-abc');

      expect(state.id).toBe('lobster-1');
      expect(state.profile).toBe(profile);
      expect(state.position.x).toBeGreaterThanOrEqual(0);
      expect(state.position.x).toBeLessThanOrEqual(10);
      expect(state.position.y).toBe(0);
      expect(state.position.z).toBeGreaterThanOrEqual(0);
      expect(state.position.z).toBeLessThanOrEqual(10);
      expect(state.rotation).toBe(0);
      expect(state.animation).toBe('idle');
      expect(state.status).toBe('online');
      expect(state.mood).toBe('neutral');
    });

    it('stores the lobster so it can be retrieved', () => {
      const profile = makeProfile();
      registry.register(profile, 'token-abc');

      expect(registry.getLobster('lobster-1')).toBeDefined();
    });
  });

  describe('unregister', () => {
    it('removes the lobster from the registry', () => {
      registry.register(makeProfile(), 'token-abc');
      registry.unregister('lobster-1');

      expect(registry.getLobster('lobster-1')).toBeUndefined();
      expect(registry.isRegistered('lobster-1')).toBe(false);
    });

    it('also removes the token', () => {
      registry.register(makeProfile(), 'token-abc');
      registry.unregister('lobster-1');

      expect(registry.validateToken('lobster-1', 'token-abc')).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('returns true for a matching token', () => {
      registry.register(makeProfile(), 'secret-token');

      expect(registry.validateToken('lobster-1', 'secret-token')).toBe(true);
    });

    it('returns false for a wrong token', () => {
      registry.register(makeProfile(), 'secret-token');

      expect(registry.validateToken('lobster-1', 'wrong-token')).toBe(false);
    });

    it('returns false for an unknown lobster', () => {
      expect(registry.validateToken('unknown', 'any-token')).toBe(false);
    });
  });

  describe('updateState', () => {
    it('merges partial updates correctly', () => {
      registry.register(makeProfile(), 'token');
      const updated = registry.updateState('lobster-1', {
        animation: 'walking',
        mood: 'happy',
        activity: 'exploring',
      });

      expect(updated).toBeDefined();
      expect(updated!.animation).toBe('walking');
      expect(updated!.mood).toBe('happy');
      expect(updated!.activity).toBe('exploring');
      // Unchanged fields remain
      expect(updated!.status).toBe('online');
      expect(updated!.rotation).toBe(0);
    });

    it('does not allow changing id', () => {
      const profile = makeProfile();
      registry.register(profile, 'token');
      const updated = registry.updateState('lobster-1', {
        id: 'hacked-id',
      } as Partial<import('@lobster-world/protocol').LobsterState>);

      expect(updated).toBeDefined();
      expect(updated!.id).toBe('lobster-1');
    });

    it('does not allow changing profile', () => {
      const profile = makeProfile();
      registry.register(profile, 'token');
      const updated = registry.updateState('lobster-1', {
        profile: { ...profile, name: 'Hacked' },
      } as Partial<import('@lobster-world/protocol').LobsterState>);

      expect(updated).toBeDefined();
      expect(updated!.profile.name).toBe('Larry');
    });

    it('returns undefined for unknown lobster', () => {
      expect(registry.updateState('unknown', { mood: 'happy' })).toBeUndefined();
    });
  });

  describe('getAllLobsters', () => {
    it('returns all registered lobsters', () => {
      registry.register(makeProfile({ id: 'l1', name: 'A' }), 't1');
      registry.register(makeProfile({ id: 'l2', name: 'B' }), 't2');
      registry.register(makeProfile({ id: 'l3', name: 'C' }), 't3');

      const all = registry.getAllLobsters();
      expect(all).toHaveLength(3);
    });
  });

  describe('getOnlineLobsters', () => {
    it('excludes offline lobsters', () => {
      registry.register(makeProfile({ id: 'l1', name: 'A' }), 't1');
      registry.register(makeProfile({ id: 'l2', name: 'B' }), 't2');
      registry.register(makeProfile({ id: 'l3', name: 'C' }), 't3');

      registry.setStatus('l2', 'offline');

      const online = registry.getOnlineLobsters();
      expect(online).toHaveLength(2);
      expect(online.map((l) => l.id)).not.toContain('l2');
    });

    it('includes busy/away/dnd lobsters', () => {
      registry.register(makeProfile({ id: 'l1' }), 't1');
      registry.register(makeProfile({ id: 'l2' }), 't2');
      registry.register(makeProfile({ id: 'l3' }), 't3');

      registry.setStatus('l1', 'busy');
      registry.setStatus('l2', 'away');
      registry.setStatus('l3', 'dnd');

      expect(registry.getOnlineLobsters()).toHaveLength(3);
    });
  });

  describe('setStatus', () => {
    it('changes the lobster status', () => {
      registry.register(makeProfile(), 'token');
      registry.setStatus('lobster-1', 'busy');

      expect(registry.getLobster('lobster-1')!.status).toBe('busy');
    });

    it('does nothing for unknown lobster', () => {
      // Should not throw
      registry.setStatus('unknown', 'offline');
    });
  });

  describe('getLobsterCount', () => {
    it('returns 0 for empty registry', () => {
      expect(registry.getLobsterCount()).toBe(0);
    });

    it('returns correct count after registrations', () => {
      registry.register(makeProfile({ id: 'l1' }), 't1');
      registry.register(makeProfile({ id: 'l2' }), 't2');

      expect(registry.getLobsterCount()).toBe(2);
    });

    it('decrements after unregister', () => {
      registry.register(makeProfile({ id: 'l1' }), 't1');
      registry.register(makeProfile({ id: 'l2' }), 't2');
      registry.unregister('l1');

      expect(registry.getLobsterCount()).toBe(1);
    });
  });

  describe('isRegistered', () => {
    it('returns true for registered lobster', () => {
      registry.register(makeProfile(), 'token');

      expect(registry.isRegistered('lobster-1')).toBe(true);
    });

    it('returns false for unknown lobster', () => {
      expect(registry.isRegistered('unknown')).toBe(false);
    });
  });
});
