import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorldStore } from '../src/store/useWorldStore';
import type { RenderEvent, LobsterState, LobsterSkin } from '@lobster-world/protocol';
import {
  CUSTOMIZATION_DEFAULT_BODY_COLOR,
  CUSTOMIZATION_DEFAULT_CLAW_COLOR,
  LobsterPartType,
} from '@lobster-world/protocol';
import { AVAILABLE_OPTIONS } from '../src/store/slices/customizationSlice';

vi.mock('../src/lib/audio', () => ({
  playChatPing: vi.fn(),
  playJoinSound: vi.fn(),
  playTypingClick: vi.fn(),
  setMuted: vi.fn(),
  getMuted: () => true,
}));

function makeLobster(overrides: Partial<LobsterState> = {}): LobsterState {
  return {
    id: 'lobster-1',
    profile: { id: 'lobster-1', name: 'Cody', color: '#ff6b6b', skills: ['coding'] },
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    animation: 'idle',
    status: 'online',
    mood: 'happy',
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

describe('customization store slice', () => {
  beforeEach(() => {
    useWorldStore.setState({
      lobsters: { 'lobster-1': makeLobster() },
      customizerOpen: false,
      customizerLobsterId: null,
      editingSkin: {
        id: '',
        lobsterId: '',
        bodyColor: CUSTOMIZATION_DEFAULT_BODY_COLOR,
        claw1Color: CUSTOMIZATION_DEFAULT_CLAW_COLOR,
        claw2Color: CUSTOMIZATION_DEFAULT_CLAW_COLOR,
        eyeColor: '#000000',
      },
      savedPresets: [],
    });
  });

  describe('openCustomizer', () => {
    it('opens the customizer with a lobster id', () => {
      useWorldStore.getState().openCustomizer('lobster-1');
      const state = useWorldStore.getState();

      expect(state.customizerOpen).toBe(true);
      expect(state.customizerLobsterId).toBe('lobster-1');
      expect(state.editingSkin.lobsterId).toBe('lobster-1');
    });
  });

  describe('closeCustomizer', () => {
    it('closes the customizer', () => {
      useWorldStore.getState().openCustomizer('lobster-1');
      useWorldStore.getState().closeCustomizer();
      const state = useWorldStore.getState();

      expect(state.customizerOpen).toBe(false);
      expect(state.customizerLobsterId).toBeNull();
    });
  });

  describe('updateEditingSkin', () => {
    it('updates partial skin fields', () => {
      useWorldStore.getState().openCustomizer('lobster-1');
      useWorldStore.getState().updateEditingSkin({ bodyColor: '#00FF00' });

      expect(useWorldStore.getState().editingSkin.bodyColor).toBe('#00FF00');
    });

    it('preserves other skin fields', () => {
      useWorldStore.getState().openCustomizer('lobster-1');
      useWorldStore.getState().updateEditingSkin({ claw1Color: '#111111' });

      const skin = useWorldStore.getState().editingSkin;
      expect(skin.claw1Color).toBe('#111111');
      expect(skin.bodyColor).toBe(CUSTOMIZATION_DEFAULT_BODY_COLOR);
    });
  });

  describe('resetEditingSkin', () => {
    it('resets to default colors', () => {
      useWorldStore.getState().openCustomizer('lobster-1');
      useWorldStore.getState().updateEditingSkin({ bodyColor: '#999999' });
      useWorldStore.getState().resetEditingSkin();

      const skin = useWorldStore.getState().editingSkin;
      expect(skin.bodyColor).toBe(CUSTOMIZATION_DEFAULT_BODY_COLOR);
      expect(skin.lobsterId).toBe('lobster-1');
    });
  });

  describe('savedPresets', () => {
    it('saves a preset', () => {
      const skin = makeSkin();
      useWorldStore.getState().savePreset(skin);

      expect(useWorldStore.getState().savedPresets).toHaveLength(1);
      expect(useWorldStore.getState().savedPresets[0].id).toBe('skin-1');
    });

    it('removes a preset by id', () => {
      useWorldStore.getState().savePreset(makeSkin({ id: 's1' }));
      useWorldStore.getState().savePreset(makeSkin({ id: 's2' }));
      useWorldStore.getState().removePreset('s1');

      expect(useWorldStore.getState().savedPresets).toHaveLength(1);
      expect(useWorldStore.getState().savedPresets[0].id).toBe('s2');
    });

    it('loads a preset into editing skin', () => {
      const skin = makeSkin({ bodyColor: '#AABBCC' });
      useWorldStore.getState().openCustomizer('lobster-1');
      useWorldStore.getState().loadPreset(skin);

      expect(useWorldStore.getState().editingSkin.bodyColor).toBe('#AABBCC');
    });
  });
});

describe('skin_update RenderEvent', () => {
  beforeEach(() => {
    useWorldStore.setState({
      lobsters: { 'lobster-1': makeLobster() },
      stats: { lobsterCount: 1, realLobsterCount: 0, demoLobsterCount: 1, activeDialogues: 0, totalMessages: 0 },
      activeDialogues: {},
      lobsterStats: {},
      effects: [],
      entranceAnimations: {},
    });
  });

  it('applies skin to an existing lobster via skin_update event', () => {
    const skin = makeSkin({ bodyColor: '#FF0000' });
    const event: RenderEvent = {
      type: 'skin_update',
      lobsterId: 'lobster-1',
      skin,
    };

    useWorldStore.getState().handleRenderEvent(event);

    const lobster = useWorldStore.getState().lobsters['lobster-1'];
    expect(lobster.skin).toBeDefined();
    expect(lobster.skin!.bodyColor).toBe('#FF0000');
  });

  it('ignores skin_update for unknown lobster', () => {
    const skin = makeSkin({ lobsterId: 'unknown' });
    const event: RenderEvent = {
      type: 'skin_update',
      lobsterId: 'unknown',
      skin,
    };

    useWorldStore.getState().handleRenderEvent(event);

    expect(useWorldStore.getState().lobsters['unknown']).toBeUndefined();
  });

  it('lobster_join preserves skin field', () => {
    const lobster = makeLobster({
      id: 'lobster-2',
      profile: { id: 'lobster-2', name: 'Skinny', color: '#00FF00', skills: [] },
      skin: makeSkin({ lobsterId: 'lobster-2', bodyColor: '#AABB00' }),
    });

    const event: RenderEvent = {
      type: 'lobster_join',
      lobster,
    };

    useWorldStore.getState().handleRenderEvent(event);

    const joined = useWorldStore.getState().lobsters['lobster-2'];
    expect(joined.skin).toBeDefined();
    expect(joined.skin!.bodyColor).toBe('#AABB00');
  });
});

describe('AVAILABLE_OPTIONS', () => {
  it('has options for all part types', () => {
    expect(AVAILABLE_OPTIONS.body.length).toBeGreaterThan(0);
    expect(AVAILABLE_OPTIONS.claws.length).toBeGreaterThan(0);
    expect(AVAILABLE_OPTIONS.eyes.length).toBeGreaterThan(0);
    expect(AVAILABLE_OPTIONS.tail.length).toBeGreaterThan(0);
    expect(AVAILABLE_OPTIONS.accessories.length).toBeGreaterThan(0);
  });

  it('all options have required fields', () => {
    for (const partType of Object.values(LobsterPartType)) {
      for (const opt of AVAILABLE_OPTIONS[partType]) {
        expect(opt.id).toBeDefined();
        expect(opt.displayName).toBeDefined();
        expect(opt.type).toBe(partType);
      }
    }
  });
});
