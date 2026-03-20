import { describe, it, expect, beforeEach } from 'vitest';
import { useWorldStore } from '../src/store/useWorldStore';
import type { RenderEvent, LobsterState, Scene } from '@lobster-world/protocol';

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

function makeScene(lobsters: LobsterState[] = []): Scene {
  const lobsterMap: Record<string, LobsterState> = {};
  for (const l of lobsters) lobsterMap[l.id] = l;
  return {
    id: 'office-main',
    name: 'Virtual Office',
    type: 'office',
    capacity: 50,
    lobsters: lobsterMap,
    objects: [],
  };
}

describe('useWorldStore', () => {
  beforeEach(() => {
    useWorldStore.setState({
      lobsters: {},
      dialogues: [],
      connectionStatus: 'disconnected',
      stats: { lobsterCount: 0, activeDialogues: 0, totalMessages: 0 },
      focusLobsterId: null,
    });
  });

  it('handles full_sync', () => {
    const lobster = makeLobster();
    const event: RenderEvent = { type: 'full_sync', scene: makeScene([lobster]) };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.lobsters['lobster-1']).toEqual(lobster);
    expect(state.stats.lobsterCount).toBe(1);
  });

  it('handles lobster_join', () => {
    const lobster = makeLobster({ id: 'lobster-2', profile: { id: 'lobster-2', name: 'Suki', color: '#4ecdc4', skills: [] } });
    const event: RenderEvent = { type: 'lobster_join', lobster };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.lobsters['lobster-2']).toEqual(lobster);
    expect(state.stats.lobsterCount).toBe(1);
  });

  it('handles lobster_leave', () => {
    const lobster = makeLobster();
    useWorldStore.setState({ lobsters: { 'lobster-1': lobster }, stats: { lobsterCount: 1, activeDialogues: 0, totalMessages: 0 } });

    const event: RenderEvent = { type: 'lobster_leave', lobsterId: 'lobster-1' };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.lobsters['lobster-1']).toBeUndefined();
    expect(state.stats.lobsterCount).toBe(0);
  });

  it('handles lobster_update with delta', () => {
    const lobster = makeLobster();
    useWorldStore.setState({ lobsters: { 'lobster-1': lobster } });

    const event: RenderEvent = {
      type: 'lobster_update',
      lobsterId: 'lobster-1',
      delta: { position: { x: 1, y: 0, z: 2 }, animation: 'walking' },
    };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.lobsters['lobster-1'].position).toEqual({ x: 1, y: 0, z: 2 });
    expect(state.lobsters['lobster-1'].animation).toBe('walking');
    expect(state.lobsters['lobster-1'].profile.name).toBe('Cody');
  });

  it('handles lobster_update for non-existent lobster (no-op)', () => {
    const event: RenderEvent = {
      type: 'lobster_update',
      lobsterId: 'non-existent',
      delta: { animation: 'walking' },
    };
    useWorldStore.getState().handleRenderEvent(event);
    expect(Object.keys(useWorldStore.getState().lobsters)).toHaveLength(0);
  });

  it('handles dialogue_bubble', () => {
    const lobster = makeLobster();
    useWorldStore.setState({ lobsters: { 'lobster-1': lobster } });

    const event: RenderEvent = {
      type: 'dialogue_bubble',
      lobsterIds: ['lobster-1'],
      preview: 'Hello there!',
    };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.lobsters['lobster-1'].bubbleText).toBe('Hello there!');
    expect(state.stats.totalMessages).toBe(1);
  });

  it('handles dialogue_bubble without preview', () => {
    const lobster = makeLobster();
    useWorldStore.setState({ lobsters: { 'lobster-1': lobster } });

    const event: RenderEvent = {
      type: 'dialogue_bubble',
      lobsterIds: ['lobster-1'],
    };
    useWorldStore.getState().handleRenderEvent(event);

    expect(useWorldStore.getState().lobsters['lobster-1'].bubbleText).toBe('...');
  });

  it('sets connection status', () => {
    useWorldStore.getState().setConnectionStatus('connected');
    expect(useWorldStore.getState().connectionStatus).toBe('connected');
  });

  it('clears bubble text', () => {
    const lobster = makeLobster({ bubbleText: 'Hello' });
    useWorldStore.setState({ lobsters: { 'lobster-1': lobster } });

    useWorldStore.getState().clearBubble('lobster-1');
    expect(useWorldStore.getState().lobsters['lobster-1'].bubbleText).toBeUndefined();
  });

  it('sets focus lobster', () => {
    useWorldStore.getState().setFocusLobster('lobster-1');
    expect(useWorldStore.getState().focusLobsterId).toBe('lobster-1');

    useWorldStore.getState().setFocusLobster(null);
    expect(useWorldStore.getState().focusLobsterId).toBeNull();
  });

  it('clears focus when focused lobster leaves', () => {
    const lobster = makeLobster();
    useWorldStore.setState({
      lobsters: { 'lobster-1': lobster },
      focusLobsterId: 'lobster-1',
      stats: { lobsterCount: 1, activeDialogues: 0, totalMessages: 0 },
    });

    useWorldStore.getState().handleRenderEvent({ type: 'lobster_leave', lobsterId: 'lobster-1' });
    expect(useWorldStore.getState().focusLobsterId).toBeNull();
  });
});
