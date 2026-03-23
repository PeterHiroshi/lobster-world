import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorldStore } from '../src/store/useWorldStore';
import type { RenderEvent, LobsterState, Scene, PermissionRequest, BudgetStatus } from '@lobster-world/protocol';

// Mock audio module (no AudioContext in test env)
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
      stats: { lobsterCount: 0, realLobsterCount: 0, demoLobsterCount: 0, activeDialogues: 0, totalMessages: 0 },
      focusLobsterId: null,
      selectedLobsterId: null,
      lobsterStats: {},
      activeDialogues: {},
      effects: [],
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

  it('handles lobster_join with entrance animation', () => {
    const lobster = makeLobster({ id: 'lobster-2', profile: { id: 'lobster-2', name: 'Suki', color: '#4ecdc4', skills: [] } });
    const event: RenderEvent = { type: 'lobster_join', lobster };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    // Lobster starts at entrance position, not original
    expect(state.lobsters['lobster-2'].position).toEqual({ x: 0, y: 0, z: -10 });
    expect(state.lobsters['lobster-2'].animation).toBe('walking');
    expect(state.lobsters['lobster-2'].profile.name).toBe('Suki');
    expect(state.stats.lobsterCount).toBe(1);
    // Entrance animation target is original position
    expect(state.entranceAnimations['lobster-2']).toBeDefined();
  });

  it('handles lobster_leave', () => {
    const lobster = makeLobster();
    useWorldStore.setState({ lobsters: { 'lobster-1': lobster }, stats: { lobsterCount: 1, realLobsterCount: 0, demoLobsterCount: 1, activeDialogues: 0, totalMessages: 0 } });

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
      stats: { lobsterCount: 1, realLobsterCount: 0, demoLobsterCount: 1, activeDialogues: 0, totalMessages: 0 },
    });

    useWorldStore.getState().handleRenderEvent({ type: 'lobster_leave', lobsterId: 'lobster-1' });
    expect(useWorldStore.getState().focusLobsterId).toBeNull();
  });

  // --- Phase 1 tests ---

  it('sets and clears selected lobster', () => {
    useWorldStore.getState().setSelectedLobster('lobster-1');
    expect(useWorldStore.getState().selectedLobsterId).toBe('lobster-1');

    useWorldStore.getState().setSelectedLobster(null);
    expect(useWorldStore.getState().selectedLobsterId).toBeNull();
  });

  it('clears selected lobster on leave', () => {
    const lobster = makeLobster();
    useWorldStore.setState({
      lobsters: { 'lobster-1': lobster },
      selectedLobsterId: 'lobster-1',
      stats: { lobsterCount: 1, realLobsterCount: 0, demoLobsterCount: 1, activeDialogues: 0, totalMessages: 0 },
    });

    useWorldStore.getState().handleRenderEvent({ type: 'lobster_leave', lobsterId: 'lobster-1' });
    expect(useWorldStore.getState().selectedLobsterId).toBeNull();
  });

  it('handles dialogue_start event', () => {
    const l1 = makeLobster({ id: 'l1' });
    const l2 = makeLobster({ id: 'l2' });
    useWorldStore.setState({ lobsters: { l1, l2 } });

    const event: RenderEvent = {
      type: 'dialogue_start',
      sessionId: 'session-1',
      participants: ['l1', 'l2'],
      participantNames: ['Cody', 'Suki'],
      participantColors: ['#ff0000', '#00ff00'],
      intent: 'Code review',
    };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.activeDialogues['session-1']).toBeDefined();
    expect(state.activeDialogues['session-1'].intent).toBe('Code review');
    expect(state.stats.activeDialogues).toBe(1);
    expect(state.lobsterStats['l1']?.dialoguesParticipated).toBe(1);
    expect(state.lobsterStats['l2']?.dialoguesParticipated).toBe(1);
  });

  it('handles dialogue_msg event', () => {
    useWorldStore.setState({
      activeDialogues: {
        'session-1': {
          sessionId: 'session-1',
          participants: ['l1', 'l2'],
          participantNames: ['Cody', 'Suki'],
          participantColors: ['#ff0000', '#00ff00'],
          intent: 'test',
          messages: [],
          ended: false,
        },
      },
    });

    const event: RenderEvent = {
      type: 'dialogue_msg',
      sessionId: 'session-1',
      fromId: 'l1',
      fromName: 'Cody',
      fromColor: '#ff0000',
      content: 'Hello!',
      turnNumber: 1,
    };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.activeDialogues['session-1'].messages).toHaveLength(1);
    expect(state.activeDialogues['session-1'].messages[0].content).toBe('Hello!');
    expect(state.lobsterStats['l1']?.messagesSent).toBe(1);
  });

  it('handles dialogue_end event', () => {
    useWorldStore.setState({
      activeDialogues: {
        'session-1': {
          sessionId: 'session-1',
          participants: ['l1', 'l2'],
          participantNames: ['Cody', 'Suki'],
          participantColors: ['#ff0000', '#00ff00'],
          intent: 'test',
          messages: [],
          ended: false,
        },
      },
      stats: { lobsterCount: 2, realLobsterCount: 0, demoLobsterCount: 2, activeDialogues: 1, totalMessages: 0 },
    });

    const event: RenderEvent = {
      type: 'dialogue_end',
      sessionId: 'session-1',
      reason: 'completed',
    };
    useWorldStore.getState().handleRenderEvent(event);

    const state = useWorldStore.getState();
    expect(state.activeDialogues['session-1'].ended).toBe(true);
    expect(state.activeDialogues['session-1'].endReason).toBe('completed');
    expect(state.stats.activeDialogues).toBe(0);
  });

  it('adds confetti effect and entrance animation on lobster_join', () => {
    const lobster = makeLobster({ id: 'lobster-new', position: { x: 3, y: 0, z: 2 } });
    useWorldStore.getState().handleRenderEvent({ type: 'lobster_join', lobster });

    const state = useWorldStore.getState();
    expect(state.effects.length).toBeGreaterThanOrEqual(1);
    expect(state.effects[0].type).toBe('confetti');

    // Entrance animation: lobster starts at entrance, target is original position
    expect(state.entranceAnimations['lobster-new']).toBeDefined();
    expect(state.entranceAnimations['lobster-new'].targetPos).toEqual({ x: 3, y: 0, z: 2 });
    // Lobster position should be at entrance
    expect(state.lobsters['lobster-new'].position).toEqual({ x: 0, y: 0, z: -10 });
  });

  it('clearEntrance removes entrance animation', () => {
    useWorldStore.setState({
      entranceAnimations: { 'lobster-1': { targetPos: { x: 1, y: 0, z: 1 }, startTime: Date.now() } },
    });
    useWorldStore.getState().clearEntrance('lobster-1');
    expect(useWorldStore.getState().entranceAnimations['lobster-1']).toBeUndefined();
  });

  it('adds sparkle effect on dialogue_start', () => {
    const l1 = makeLobster({ id: 'l1', position: { x: 0, y: 0, z: 0 } });
    const l2 = makeLobster({ id: 'l2', position: { x: 2, y: 0, z: 2 } });
    useWorldStore.setState({ lobsters: { l1, l2 } });

    useWorldStore.getState().handleRenderEvent({
      type: 'dialogue_start',
      sessionId: 's1',
      participants: ['l1', 'l2'],
      participantNames: ['Cody', 'Suki'],
      participantColors: ['#ff0000', '#00ff00'],
      intent: 'test',
    });

    const state = useWorldStore.getState();
    const sparkle = state.effects.find((e) => e.type === 'sparkle');
    expect(sparkle).toBeDefined();
    expect(sparkle!.position.x).toBe(1); // midpoint
  });

  // --- Phase 2b Part 2: Lobby State ---

  it('starts with landing phase', () => {
    const state = useWorldStore.getState();
    expect(state.lobbyState.phase).toBe('landing');
    expect(state.lobbyState.profile).toBeNull();
    expect(state.lobbyState.sessionToken).toBeNull();
    expect(state.lobbyState.error).toBeNull();
  });

  it('setLobbyPhase transitions phase and clears error', () => {
    useWorldStore.setState({
      lobbyState: { phase: 'lobby', profile: null, sessionToken: null, error: 'some error' },
    });
    useWorldStore.getState().setLobbyPhase('joining');
    const state = useWorldStore.getState();
    expect(state.lobbyState.phase).toBe('joining');
    expect(state.lobbyState.error).toBeNull();
  });

  it('setLobbyProfile stores profile', () => {
    const profile = {
      displayName: 'Test',
      color: '#EF4444',
      bio: 'Hello',
      skills: ['coding' as const],
      dailyTokenLimit: 50000,
      sessionTokenLimit: 5000,
      permissionPreset: 'open' as const,
    };
    useWorldStore.getState().setLobbyProfile(profile);
    expect(useWorldStore.getState().lobbyState.profile).toEqual(profile);
  });

  it('setLobbyError sets error and reverts to lobby phase', () => {
    useWorldStore.setState({
      lobbyState: { phase: 'joining', profile: null, sessionToken: null, error: null },
    });
    useWorldStore.getState().setLobbyError('Auth failed');
    const state = useWorldStore.getState();
    expect(state.lobbyState.error).toBe('Auth failed');
    expect(state.lobbyState.phase).toBe('lobby');
  });

  it('setLobbyError with null clears error', () => {
    useWorldStore.setState({
      lobbyState: { phase: 'joining', profile: null, sessionToken: null, error: 'err' },
    });
    useWorldStore.getState().setLobbyError(null);
    const state = useWorldStore.getState();
    expect(state.lobbyState.error).toBeNull();
    expect(state.lobbyState.phase).toBe('joining');
  });

  it('setSessionToken transitions to joined phase', () => {
    useWorldStore.setState({
      lobbyState: { phase: 'joining', profile: null, sessionToken: null, error: null },
    });
    useWorldStore.getState().setSessionToken('token-abc');
    const state = useWorldStore.getState();
    expect(state.lobbyState.sessionToken).toBe('token-abc');
    expect(state.lobbyState.phase).toBe('joined');
  });

  // --- Permission Requests ---

  it('addPermissionRequest adds to list', () => {
    const request: PermissionRequest = {
      id: 'perm-1',
      requesterId: 'lobster-2',
      requesterName: 'Suki',
      requesterColor: '#4ecdc4',
      dataType: 'skills',
      timestamp: Date.now(),
    };
    useWorldStore.getState().addPermissionRequest(request);
    expect(useWorldStore.getState().permissionRequests).toHaveLength(1);
    expect(useWorldStore.getState().permissionRequests[0].id).toBe('perm-1');
  });

  it('resolvePermissionRequest removes from list', () => {
    const request: PermissionRequest = {
      id: 'perm-1',
      requesterId: 'lobster-2',
      requesterName: 'Suki',
      requesterColor: '#4ecdc4',
      dataType: 'skills',
      timestamp: Date.now(),
    };
    useWorldStore.setState({ permissionRequests: [request] });
    useWorldStore.getState().resolvePermissionRequest('perm-1');
    expect(useWorldStore.getState().permissionRequests).toHaveLength(0);
  });

  it('handles permission_request RenderEvent', () => {
    const request: PermissionRequest = {
      id: 'perm-2',
      requesterId: 'lobster-3',
      requesterName: 'Phil',
      requesterColor: '#ffd93d',
      dataType: 'activity',
      timestamp: Date.now(),
    };
    useWorldStore.getState().handleRenderEvent({ type: 'permission_request', request });
    expect(useWorldStore.getState().permissionRequests).toHaveLength(1);
  });

  // --- Budget Status ---

  it('setBudgetStatus updates budget', () => {
    const status: BudgetStatus = {
      dailyTokensUsed: 10000,
      dailyTokensLimit: 50000,
      dailySessionsUsed: 2,
      dailySessionsLimit: 20,
      activeSessionTokens: 500,
      activeSessionLimit: 5000,
    };
    useWorldStore.getState().setBudgetStatus(status);
    expect(useWorldStore.getState().budgetStatus).toEqual(status);
  });

  it('handles budget_status RenderEvent', () => {
    const status: BudgetStatus = {
      dailyTokensUsed: 5000,
      dailyTokensLimit: 50000,
      dailySessionsUsed: 1,
      dailySessionsLimit: 20,
      activeSessionTokens: 200,
      activeSessionLimit: 5000,
    };
    useWorldStore.getState().handleRenderEvent({ type: 'budget_status', status });
    expect(useWorldStore.getState().budgetStatus).toEqual(status);
  });

  it('should handle render_batch by processing all sub-events', () => {
    const l1 = makeLobster({ id: 'batch-1', profile: { id: 'batch-1', name: 'B1', color: '#ff0000', skills: [] } });
    const l2 = makeLobster({ id: 'batch-2', profile: { id: 'batch-2', name: 'B2', color: '#00ff00', skills: [] } });

    const batchEvent: RenderEvent = {
      type: 'render_batch',
      events: [
        { type: 'lobster_join', lobster: l1 },
        { type: 'lobster_join', lobster: l2 },
      ],
    };

    useWorldStore.getState().handleRenderEvent(batchEvent);

    const state = useWorldStore.getState();
    expect(state.lobsters['batch-1']).toBeDefined();
    expect(state.lobsters['batch-2']).toBeDefined();
    expect(state.stats.lobsterCount).toBe(2);
  });

  it('should handle render_batch with mixed event types', () => {
    const l1 = makeLobster({ id: 'mix-1', profile: { id: 'mix-1', name: 'M1', color: '#ff0000', skills: [] } });
    useWorldStore.getState().handleRenderEvent({ type: 'lobster_join', lobster: l1 });

    const batchEvent: RenderEvent = {
      type: 'render_batch',
      events: [
        { type: 'lobster_update', lobsterId: 'mix-1', delta: { animation: 'walking' } },
        { type: 'lobster_leave', lobsterId: 'mix-1' },
      ],
    };

    useWorldStore.getState().handleRenderEvent(batchEvent);
    expect(useWorldStore.getState().lobsters['mix-1']).toBeUndefined();
  });
});
