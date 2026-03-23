import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorldStore } from '../src/store/useWorldStore';
import type { RenderEvent, LobsterState } from '@lobster-world/protocol';

// Mock audio module
vi.mock('../src/lib/audio', () => ({
  playChatPing: vi.fn(),
  playJoinSound: vi.fn(),
  playTypingClick: vi.fn(),
  setMuted: vi.fn(),
  getMuted: () => true,
}));

function makeLobster(id: string, x: number = 0): LobsterState {
  return {
    id,
    profile: { id, name: id, color: '#ff0000', skills: [] },
    position: { x, y: 0, z: 0 },
    rotation: 0,
    animation: 'idle',
    status: 'online',
    mood: 'happy',
  };
}

describe('A2A Slice', () => {
  beforeEach(() => {
    useWorldStore.setState({
      lobsters: {
        'agent-a': makeLobster('agent-a', -3),
        'agent-b': makeLobster('agent-b', 3),
      },
      a2aConnections: [],
      a2aActivities: [],
      a2aNotifications: {},
      a2aCollabSessions: [],
    });
  });

  // --- Direct slice actions ---

  it('addA2AConnection adds and auto-removes', () => {
    vi.useFakeTimers();
    const store = useWorldStore.getState();
    store.addA2AConnection({
      id: 'conn-1',
      fromId: 'agent-a',
      toId: 'agent-b',
      type: 'task_delegate',
      startTime: Date.now(),
    });
    expect(useWorldStore.getState().a2aConnections).toHaveLength(1);

    vi.advanceTimersByTime(4000);
    expect(useWorldStore.getState().a2aConnections).toHaveLength(0);
    vi.useRealTimers();
  });

  it('addA2AActivity keeps max 50', () => {
    const store = useWorldStore.getState();
    for (let i = 0; i < 55; i++) {
      store.addA2AActivity({
        id: `act-${i}`,
        type: 'ping',
        fromId: 'a',
        toId: 'b',
        summary: `msg ${i}`,
        timestamp: Date.now(),
      });
    }
    expect(useWorldStore.getState().a2aActivities).toHaveLength(50);
  });

  it('incrementNotification and clearNotifications', () => {
    const store = useWorldStore.getState();
    store.incrementNotification('agent-b');
    store.incrementNotification('agent-b');
    expect(useWorldStore.getState().a2aNotifications['agent-b']).toBe(2);

    store.clearNotifications('agent-b');
    expect(useWorldStore.getState().a2aNotifications['agent-b']).toBeUndefined();
  });

  it('addCollabSession and removeCollabSession', () => {
    const store = useWorldStore.getState();
    store.addCollabSession('collab-1');
    expect(useWorldStore.getState().a2aCollabSessions).toContain('collab-1');

    store.removeCollabSession('collab-1');
    expect(useWorldStore.getState().a2aCollabSessions).not.toContain('collab-1');
  });

  // --- RenderEvent handlers ---

  it('handles a2a_task_delegate event', () => {
    const event: RenderEvent = {
      type: 'a2a_task_delegate',
      fromId: 'agent-a',
      toId: 'agent-b',
      taskTitle: 'Build feature',
    };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.a2aConnections).toHaveLength(1);
    expect(state.a2aConnections[0].type).toBe('task_delegate');
    expect(state.a2aActivities).toHaveLength(1);
    expect(state.a2aActivities[0].summary).toContain('Build feature');
    expect(state.a2aNotifications['agent-b']).toBe(1);
  });

  it('handles a2a_review_request event', () => {
    const event: RenderEvent = {
      type: 'a2a_review_request',
      fromId: 'agent-a',
      toId: 'agent-b',
      title: 'Review PR #42',
    };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.a2aActivities).toHaveLength(1);
    expect(state.a2aActivities[0].summary).toContain('Review PR #42');
  });

  it('handles a2a_knowledge_share event', () => {
    const event: RenderEvent = {
      type: 'a2a_knowledge_share',
      fromId: 'agent-a',
      topic: 'Design patterns',
      recipients: ['agent-b'],
    };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.a2aConnections).toHaveLength(1);
    expect(state.a2aActivities).toHaveLength(1);
    expect(state.a2aActivities[0].summary).toContain('Design patterns');
  });

  it('handles a2a_collab_start event', () => {
    const event: RenderEvent = {
      type: 'a2a_collab_start',
      sessionId: 'collab-1',
      participants: ['agent-a', 'agent-b'],
      topic: 'API design',
    };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.a2aCollabSessions).toContain('collab-1');
    expect(state.a2aActivities).toHaveLength(1);
    expect(state.a2aActivities[0].summary).toContain('API design');
  });
});
