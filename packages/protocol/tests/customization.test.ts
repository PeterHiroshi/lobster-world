import { describe, it, expect } from 'vitest';
import {
  LobsterPartType,
  CUSTOMIZATION_DEFAULT_BODY_COLOR,
  CUSTOMIZATION_DEFAULT_CLAW_COLOR,
  CUSTOMIZATION_SCALE_MIN,
  CUSTOMIZATION_SCALE_MAX,
  CUSTOMIZATION_MAX_PRESETS,
  CUSTOMIZATION_HEX_COLOR_REGEX,
} from '../src/index';
import type {
  LobsterSkin,
  LobsterCustomizationOption,
  CustomizationRenderConfig,
  LobsterBaseModel,
  LobsterDetailLevel,
} from '../src/index';

describe('customization types', () => {
  it('LobsterPartType enum has expected values', () => {
    expect(LobsterPartType.BODY).toBe('body');
    expect(LobsterPartType.CLAWS).toBe('claws');
    expect(LobsterPartType.EYES).toBe('eyes');
    expect(LobsterPartType.TAIL).toBe('tail');
    expect(LobsterPartType.ACCESSORIES).toBe('accessories');
  });

  it('LobsterPartType enum has exactly 5 members', () => {
    const values = Object.values(LobsterPartType);
    expect(values).toHaveLength(5);
  });

  it('LobsterSkin interface accepts valid data', () => {
    const skin: LobsterSkin = {
      id: 'skin-1',
      lobsterId: 'lobster-1',
      bodyColor: '#FF6B35',
      claw1Color: '#333333',
      claw2Color: '#444444',
      accessoryType: 'hat',
      tailStyle: 'fan',
      eyeColor: '#00FF00',
      eyeStyle: 'round',
    };
    expect(skin.id).toBe('skin-1');
    expect(skin.bodyColor).toBe('#FF6B35');
    expect(skin.claw1Color).toBe('#333333');
  });

  it('LobsterSkin works with minimal fields', () => {
    const skin: LobsterSkin = {
      id: 'skin-2',
      lobsterId: 'lobster-2',
      bodyColor: '#FF0000',
    };
    expect(skin.claw1Color).toBeUndefined();
    expect(skin.claw2Color).toBeUndefined();
    expect(skin.accessoryType).toBeUndefined();
  });

  it('LobsterCustomizationOption has required fields', () => {
    const option: LobsterCustomizationOption = {
      type: LobsterPartType.BODY,
      id: 'capsule_standard',
      displayName: 'Classic Capsule',
    };
    expect(option.type).toBe('body');
    expect(option.id).toBe('capsule_standard');
    expect(option.price).toBeUndefined();
    expect(option.unlockedAt).toBeUndefined();
  });

  it('CustomizationRenderConfig accepts valid data', () => {
    const config: CustomizationRenderConfig = {
      baseModel: 'capsule',
      scale: 1.0,
      detail: 'medium',
    };
    expect(config.baseModel).toBe('capsule');
    expect(config.scale).toBe(1.0);
    expect(config.detail).toBe('medium');
  });

  it('LobsterBaseModel type allows correct values', () => {
    const models: LobsterBaseModel[] = ['capsule', 'realistic', 'cartoon'];
    expect(models).toHaveLength(3);
  });

  it('LobsterDetailLevel type allows correct values', () => {
    const levels: LobsterDetailLevel[] = ['low', 'medium', 'high'];
    expect(levels).toHaveLength(3);
  });
});

describe('customization constants', () => {
  it('default body color is OpenClaw orange', () => {
    expect(CUSTOMIZATION_DEFAULT_BODY_COLOR).toBe('#FF6B35');
  });

  it('default claw color is dark gray', () => {
    expect(CUSTOMIZATION_DEFAULT_CLAW_COLOR).toBe('#333333');
  });

  it('scale bounds are correct', () => {
    expect(CUSTOMIZATION_SCALE_MIN).toBe(0.5);
    expect(CUSTOMIZATION_SCALE_MAX).toBe(1.5);
    expect(CUSTOMIZATION_SCALE_MIN).toBeLessThan(CUSTOMIZATION_SCALE_MAX);
  });

  it('max presets is reasonable', () => {
    expect(CUSTOMIZATION_MAX_PRESETS).toBe(10);
    expect(CUSTOMIZATION_MAX_PRESETS).toBeGreaterThan(0);
  });

  it('hex color regex validates correct colors', () => {
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('#FF6B35')).toBe(true);
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('#000000')).toBe(true);
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('#ffffff')).toBe(true);
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('#aAbBcC')).toBe(true);
  });

  it('hex color regex rejects invalid colors', () => {
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('FF6B35')).toBe(false);
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('#FF6B3')).toBe(false);
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('#FF6B355')).toBe(false);
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('#GGGGGG')).toBe(false);
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('red')).toBe(false);
    expect(CUSTOMIZATION_HEX_COLOR_REGEX.test('')).toBe(false);
  });
});

describe('LobsterState skin integration', () => {
  it('LobsterState accepts optional skin field', () => {
    const state = {
      id: 'lobster-1',
      profile: { id: 'lobster-1', name: 'Test', color: '#FF0000', skills: [] },
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      animation: 'idle' as const,
      status: 'online' as const,
      mood: 'neutral' as const,
      skin: {
        id: 'skin-1',
        lobsterId: 'lobster-1',
        bodyColor: '#FF6B35',
      },
    };
    expect(state.skin).toBeDefined();
    expect(state.skin.bodyColor).toBe('#FF6B35');
  });

  it('LobsterState works without skin', () => {
    const state = {
      id: 'lobster-1',
      profile: { id: 'lobster-1', name: 'Test', color: '#FF0000', skills: [] },
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      animation: 'idle' as const,
      status: 'online' as const,
      mood: 'neutral' as const,
    };
    expect(state.skin).toBeUndefined();
  });
});
