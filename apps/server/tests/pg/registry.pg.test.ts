/**
 * LobsterRegistry — PostgreSQL Integration Tests
 *
 * Tests the LobsterRegistry with PgLobsterRepo + PgSkinPresetRepo.
 * Registry keeps runtime state in-memory and persists profile data to PG.
 * Skipped when TEST_DATABASE_URL is not set.
 */
import { pgTestSuite } from '../helpers/pg-test-helpers.js';
import { LobsterRegistry } from '../../src/engine/registry.js';
import { PgLobsterRepo } from '../../src/db/repositories/lobster-repo.js';
import { PgSkinPresetRepo } from '../../src/db/repositories/skin-preset-repo.js';
import type { PublicProfile } from '@lobster-world/protocol';

function makeProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id: 'lobster-1',
    name: 'Larry',
    color: '#ff0000',
    skills: ['coding', 'fishing'],
    ...overrides,
  };
}

pgTestSuite('LobsterRegistry (PostgreSQL)', ({ getDb }) => {
  let registry: LobsterRegistry;

  beforeEach(() => {
    registry = new LobsterRegistry({
      lobsterRepo: new PgLobsterRepo(getDb()),
      skinPresetRepo: new PgSkinPresetRepo(getDb()),
    });
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
      registry.register(makeProfile(), 'token-abc');
      expect(registry.getLobster('lobster-1')).toBeDefined();
    });

    it('persists profile to PG (fire-and-forget)', async () => {
      const profile = makeProfile();
      registry.register(profile, 'token-abc');
      // Give fire-and-forget persistence time to complete
      await new Promise((r) => setTimeout(r, 100));
      // Verify by checking PG directly via a new repo
      const repo = new PgLobsterRepo(getDb());
      const record = await repo.getById('lobster-1');
      expect(record).toBeDefined();
      expect(record?.name).toBe('Larry');
      expect(record?.color).toBe('#ff0000');
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
      expect(updated!.status).toBe('online');
      expect(updated!.rotation).toBe(0);
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

      expect(registry.getAllLobsters()).toHaveLength(3);
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
  });

  describe('setStatus', () => {
    it('changes the lobster status', () => {
      registry.register(makeProfile(), 'token');
      registry.setStatus('lobster-1', 'busy');

      expect(registry.getLobster('lobster-1')!.status).toBe('busy');
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
  });

  describe('skin presets (PG-backed)', () => {
    it('saves and retrieves skin presets', async () => {
      registry.register(makeProfile({ id: 'l1' }), 't1');

      const saved = await registry.savePreset('l1', {
        id: 'skin-1',
        lobsterId: 'l1',
        bodyColor: '#ff0000',
        claw1Color: '#00ff00',
      });
      expect(saved).toBe(true);

      const presets = await registry.getCustomizationPresets('l1');
      expect(presets).toHaveLength(1);
      expect(presets[0].bodyColor).toBe('#ff0000');
    });

    it('deletes a skin preset', async () => {
      registry.register(makeProfile({ id: 'l1' }), 't1');
      await registry.savePreset('l1', { id: 'skin-1', lobsterId: 'l1', bodyColor: '#ff0000' });

      expect(await registry.deletePreset('l1', 'skin-1')).toBe(true);
      expect(await registry.getCustomizationPresets('l1')).toHaveLength(0);
    });
  });
});
