import { describe, it, expect, beforeEach } from 'vitest';
import type { PublicProfile, LobsterSkin } from '@lobster-world/protocol';
import { CUSTOMIZATION_MAX_PRESETS } from '@lobster-world/protocol';
import { LobsterRegistry } from '../src/engine/registry.js';

function makeProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id: 'lobster-1',
    name: 'Larry',
    color: '#ff0000',
    skills: ['coding'],
    ...overrides,
  };
}

function makeSkin(overrides: Partial<LobsterSkin> = {}): LobsterSkin {
  return {
    id: 'skin-1',
    lobsterId: 'lobster-1',
    bodyColor: '#FF6B35',
    ...overrides,
  };
}

describe('LobsterRegistry — customization', () => {
  let registry: LobsterRegistry;

  beforeEach(() => {
    registry = new LobsterRegistry();
    registry.register(makeProfile(), 'token-abc');
  });

  describe('updateSkin', () => {
    it('applies a valid skin to a lobster', () => {
      const skin = makeSkin();
      const updated = registry.updateSkin('lobster-1', skin);

      expect(updated).toBeDefined();
      expect(updated!.skin).toBeDefined();
      expect(updated!.skin!.bodyColor).toBe('#FF6B35');
    });

    it('sets lobsterId to the target lobster id', () => {
      const skin = makeSkin({ lobsterId: 'wrong-id' });
      const updated = registry.updateSkin('lobster-1', skin);

      expect(updated!.skin!.lobsterId).toBe('lobster-1');
    });

    it('returns undefined for unregistered lobster', () => {
      expect(registry.updateSkin('unknown', makeSkin())).toBeUndefined();
    });

    it('rejects invalid bodyColor', () => {
      const skin = makeSkin({ bodyColor: 'not-a-color' });
      expect(registry.updateSkin('lobster-1', skin)).toBeUndefined();
    });

    it('rejects invalid claw1Color', () => {
      const skin = makeSkin({ claw1Color: 'bad' });
      expect(registry.updateSkin('lobster-1', skin)).toBeUndefined();
    });

    it('rejects invalid claw2Color', () => {
      const skin = makeSkin({ claw2Color: '#GGG' });
      expect(registry.updateSkin('lobster-1', skin)).toBeUndefined();
    });

    it('rejects invalid eyeColor', () => {
      const skin = makeSkin({ eyeColor: 'blue' });
      expect(registry.updateSkin('lobster-1', skin)).toBeUndefined();
    });

    it('accepts skin with all optional colors', () => {
      const skin = makeSkin({
        claw1Color: '#111111',
        claw2Color: '#222222',
        eyeColor: '#00FF00',
      });
      const updated = registry.updateSkin('lobster-1', skin);

      expect(updated).toBeDefined();
      expect(updated!.skin!.claw1Color).toBe('#111111');
      expect(updated!.skin!.claw2Color).toBe('#222222');
      expect(updated!.skin!.eyeColor).toBe('#00FF00');
    });

    it('accepts skin with non-color optional fields', () => {
      const skin = makeSkin({
        accessoryType: 'hat',
        tailStyle: 'fan',
        eyeStyle: 'round',
      });
      const updated = registry.updateSkin('lobster-1', skin);

      expect(updated!.skin!.accessoryType).toBe('hat');
      expect(updated!.skin!.tailStyle).toBe('fan');
      expect(updated!.skin!.eyeStyle).toBe('round');
    });

    it('persists skin in lobster state', () => {
      registry.updateSkin('lobster-1', makeSkin({ bodyColor: '#AABBCC' }));
      const lobster = registry.getLobster('lobster-1');

      expect(lobster!.skin).toBeDefined();
      expect(lobster!.skin!.bodyColor).toBe('#AABBCC');
    });
  });

  describe('getCustomizationPresets', () => {
    it('returns empty array when no presets saved', () => {
      expect(registry.getCustomizationPresets('lobster-1')).toEqual([]);
    });

    it('returns empty array for unregistered lobster', () => {
      expect(registry.getCustomizationPresets('unknown')).toEqual([]);
    });
  });

  describe('savePreset', () => {
    it('saves a valid preset', () => {
      const result = registry.savePreset('lobster-1', makeSkin());

      expect(result).toBe(true);
      expect(registry.getCustomizationPresets('lobster-1')).toHaveLength(1);
    });

    it('saves multiple presets', () => {
      registry.savePreset('lobster-1', makeSkin({ id: 's1' }));
      registry.savePreset('lobster-1', makeSkin({ id: 's2' }));
      registry.savePreset('lobster-1', makeSkin({ id: 's3' }));

      expect(registry.getCustomizationPresets('lobster-1')).toHaveLength(3);
    });

    it('returns false for unregistered lobster', () => {
      expect(registry.savePreset('unknown', makeSkin())).toBe(false);
    });

    it('returns false for invalid bodyColor', () => {
      expect(registry.savePreset('lobster-1', makeSkin({ bodyColor: 'bad' }))).toBe(false);
    });

    it('enforces max presets limit', () => {
      for (let i = 0; i < CUSTOMIZATION_MAX_PRESETS; i++) {
        expect(registry.savePreset('lobster-1', makeSkin({ id: `s${i}` }))).toBe(true);
      }
      expect(registry.savePreset('lobster-1', makeSkin({ id: 'overflow' }))).toBe(false);
      expect(registry.getCustomizationPresets('lobster-1')).toHaveLength(CUSTOMIZATION_MAX_PRESETS);
    });

    it('sets lobsterId on saved preset', () => {
      registry.savePreset('lobster-1', makeSkin({ lobsterId: 'wrong' }));
      const presets = registry.getCustomizationPresets('lobster-1');

      expect(presets[0].lobsterId).toBe('lobster-1');
    });
  });

  describe('deletePreset', () => {
    it('removes an existing preset', () => {
      registry.savePreset('lobster-1', makeSkin({ id: 's1' }));
      registry.savePreset('lobster-1', makeSkin({ id: 's2' }));

      expect(registry.deletePreset('lobster-1', 's1')).toBe(true);
      expect(registry.getCustomizationPresets('lobster-1')).toHaveLength(1);
      expect(registry.getCustomizationPresets('lobster-1')[0].id).toBe('s2');
    });

    it('returns false for non-existent preset', () => {
      registry.savePreset('lobster-1', makeSkin({ id: 's1' }));
      expect(registry.deletePreset('lobster-1', 'nonexistent')).toBe(false);
    });

    it('returns false for lobster with no presets', () => {
      expect(registry.deletePreset('lobster-1', 's1')).toBe(false);
    });

    it('returns false for unknown lobster', () => {
      expect(registry.deletePreset('unknown', 's1')).toBe(false);
    });
  });

  describe('unregister cleans up presets', () => {
    it('removes skin presets when lobster unregisters', () => {
      registry.savePreset('lobster-1', makeSkin());
      registry.unregister('lobster-1');

      expect(registry.getCustomizationPresets('lobster-1')).toEqual([]);
    });
  });
});
