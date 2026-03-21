import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src/events.js';
import type { AnimationType, MoodType, StatusType } from '@lobster-world/protocol';

describe('EventEmitter', () => {
  it('emits state_update when animation changes', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('state_update', handler);

    emitter.emitAnimationChange('walking' as AnimationType);
    expect(handler).toHaveBeenCalledWith({ animation: 'walking' });
  });

  it('emits state_update when mood changes', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('state_update', handler);

    emitter.emitMoodChange('excited' as MoodType);
    expect(handler).toHaveBeenCalledWith({ mood: 'excited' });
  });

  it('emits state_update when status changes', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('state_update', handler);

    emitter.emitStatusChange('busy' as StatusType);
    expect(handler).toHaveBeenCalledWith({ status: 'busy' });
  });

  it('emits activity_update', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('activity_update', handler);

    emitter.emitActivityChange('Reviewing PR #42', 'focused' as MoodType);
    expect(handler).toHaveBeenCalledWith({
      activity: 'Reviewing PR #42',
      mood: 'focused',
    });
  });

  it('emits position_update', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('state_update', handler);

    emitter.emitPositionChange({ x: 1, y: 0, z: 2 });
    expect(handler).toHaveBeenCalledWith({ position: { x: 1, y: 0, z: 2 } });
  });

  it('supports multiple listeners', () => {
    const emitter = new EventEmitter();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on('state_update', h1);
    emitter.on('state_update', h2);

    emitter.emitAnimationChange('idle');
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it('removes listeners with off()', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('state_update', handler);
    emitter.off('state_update', handler);

    emitter.emitAnimationChange('idle');
    expect(handler).not.toHaveBeenCalled();
  });

  it('emits dialogue_request', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('dialogue_request', handler);

    emitter.emitDialogueRequest('target-1', 'discuss architecture', 'collab');
    expect(handler).toHaveBeenCalledWith({
      targetId: 'target-1',
      intent: 'discuss architecture',
      dialogueType: 'collab',
    });
  });
});
