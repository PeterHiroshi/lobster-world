import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { SocialProxyClient } from '../src/client.js';
import type { SocialProxyDownstream } from '@lobster-world/protocol';
import {
  RECONNECT_INITIAL_DELAY_MS,
  RECONNECT_MAX_BACKOFF_MS,
  RECONNECT_BACKOFF_MULTIPLIER,
} from '../src/constants.js';

// --- Mock WebSocket ---

class MockWebSocket extends EventEmitter {
  static CONNECTING = 0 as const;
  static OPEN = 1 as const;
  static CLOSING = 2 as const;
  static CLOSED = 3 as const;

  readyState: number = MockWebSocket.CONNECTING;
  sent: string[] = [];

  constructor(public url: string) {
    super();
    // Simulate async open
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.emit('open');
    }, 10);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close', 1000, 'normal');
  }

  // Helpers for tests
  simulateMessage(msg: SocialProxyDownstream): void {
    this.emit('message', JSON.stringify(msg));
  }

  simulateError(err: Error): void {
    this.emit('error', err);
  }

  simulateClose(code = 1006, reason = 'abnormal'): void {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close', code, reason);
  }
}

// Track instances for assertions
let wsInstances: MockWebSocket[] = [];

function createMockWsFactory() {
  return (url: string) => {
    const ws = new MockWebSocket(url);
    wsInstances.push(ws);
    return ws;
  };
}

const TEST_CONFIG = {
  serverUrl: 'ws://localhost:3001/ws/social',
  displayName: 'TestBot',
  bio: 'A test lobster',
  color: '#EF4444',
  skills: ['coding' as const],
  permissionPreset: 'selective' as const,
  dailyTokenLimit: 50000,
  sessionTokenLimit: 5000,
};

describe('SocialProxyClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    wsInstances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connection lifecycle', () => {
    it('starts in disconnected state', () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      expect(client.getState()).toBe('disconnected');
    });

    it('transitions to connecting on connect()', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      expect(client.getState()).toBe('connecting');
    });

    it('transitions to authenticating after WebSocket opens', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();

      await vi.advanceTimersByTimeAsync(20);
      expect(client.getState()).toBe('authenticating');
      expect(wsInstances).toHaveLength(1);
    });

    it('sends lobby_join after receiving auth_challenge', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();

      await vi.advanceTimersByTimeAsync(20);
      const ws = wsInstances[0];

      ws.simulateMessage({
        type: 'auth_challenge',
        challenge: { nonce: 'test-nonce-123', timestamp: Date.now() },
      });

      // Should have sent a lobby_join
      expect(ws.sent).toHaveLength(1);
      const msg = JSON.parse(ws.sent[0]);
      expect(msg.type).toBe('lobby_join');
      expect(msg.request.auth.publicKey).toBeDefined();
      expect(msg.request.auth.signature).toBeDefined();
      expect(msg.request.profile.displayName).toBe('TestBot');
    });

    it('transitions to joined after successful lobby_result', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      const joinedSpy = vi.fn();
      client.on('joined', joinedSpy);
      client.connect();

      await vi.advanceTimersByTimeAsync(20);
      const ws = wsInstances[0];

      ws.simulateMessage({
        type: 'auth_challenge',
        challenge: { nonce: 'test-nonce', timestamp: Date.now() },
      });

      ws.simulateMessage({
        type: 'lobby_result',
        result: {
          success: true,
          sessionToken: 'tok-123',
          scene: { id: 's1', name: 'Office', type: 'office', capacity: 50, lobsters: {}, objects: [] },
        },
      });

      expect(client.getState()).toBe('joined');
      expect(joinedSpy).toHaveBeenCalledOnce();
    });

    it('emits error on failed lobby_result', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      const errorSpy = vi.fn();
      client.on('error', errorSpy);
      client.connect();

      await vi.advanceTimersByTimeAsync(20);
      const ws = wsInstances[0];

      ws.simulateMessage({
        type: 'auth_challenge',
        challenge: { nonce: 'n', timestamp: Date.now() },
      });

      ws.simulateMessage({
        type: 'lobby_result',
        result: { success: false, reason: 'Lobby full' },
      });

      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'Lobby full' }));
    });

    it('disconnect() transitions to disconnected and closes WebSocket', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      client.disconnect();
      expect(client.getState()).toBe('disconnected');
      expect(wsInstances[0].readyState).toBe(MockWebSocket.CLOSED);
    });
  });

  describe('reconnection', () => {
    it('reconnects with exponential backoff on abnormal close', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20); // WS opens
      expect(wsInstances).toHaveLength(1);

      // Simulate abnormal close
      wsInstances[0].simulateClose(1006, 'abnormal');
      expect(client.getState()).toBe('reconnecting');

      // First reconnect after RECONNECT_INITIAL_DELAY_MS
      await vi.advanceTimersByTimeAsync(RECONNECT_INITIAL_DELAY_MS);
      expect(wsInstances).toHaveLength(2);

      // Second abnormal close
      await vi.advanceTimersByTimeAsync(20);
      wsInstances[1].simulateClose(1006);

      // Second reconnect after doubled delay
      await vi.advanceTimersByTimeAsync(RECONNECT_INITIAL_DELAY_MS * RECONNECT_BACKOFF_MULTIPLIER);
      expect(wsInstances).toHaveLength(3);
    });

    it('does not reconnect on intentional disconnect', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      client.disconnect();

      await vi.advanceTimersByTimeAsync(RECONNECT_MAX_BACKOFF_MS);
      expect(wsInstances).toHaveLength(1); // No new connections
    });

    it('caps backoff at RECONNECT_MAX_BACKOFF_MS', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      // Force many reconnect attempts to exceed max
      for (let i = 0; i < 10; i++) {
        wsInstances[wsInstances.length - 1].simulateClose(1006);
        const expectedDelay = Math.min(
          RECONNECT_INITIAL_DELAY_MS * Math.pow(RECONNECT_BACKOFF_MULTIPLIER, i),
          RECONNECT_MAX_BACKOFF_MS,
        );
        await vi.advanceTimersByTimeAsync(expectedDelay);
        await vi.advanceTimersByTimeAsync(20); // WS open
      }

      // All attempts should have been created
      expect(wsInstances.length).toBe(11); // 1 initial + 10 reconnects
    });

    it('resets backoff on successful reconnection', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      // First failure
      wsInstances[0].simulateClose(1006);
      await vi.advanceTimersByTimeAsync(RECONNECT_INITIAL_DELAY_MS);
      await vi.advanceTimersByTimeAsync(20); // WS opens

      // Complete successful auth
      wsInstances[1].simulateMessage({
        type: 'auth_challenge',
        challenge: { nonce: 'n', timestamp: Date.now() },
      });
      wsInstances[1].simulateMessage({
        type: 'lobby_result',
        result: {
          success: true,
          sessionToken: 'tok-2',
          scene: { id: 's1', name: 'Office', type: 'office', capacity: 50, lobsters: {}, objects: [] },
        },
      });

      expect(client.getState()).toBe('joined');

      // Second failure — should use initial delay again (backoff reset)
      wsInstances[1].simulateClose(1006);
      await vi.advanceTimersByTimeAsync(RECONNECT_INITIAL_DELAY_MS);
      expect(wsInstances).toHaveLength(3);
    });
  });

  describe('heartbeat', () => {
    it('sends periodic heartbeat pings after joining', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      const ws = wsInstances[0];
      ws.simulateMessage({
        type: 'auth_challenge',
        challenge: { nonce: 'n', timestamp: Date.now() },
      });
      ws.simulateMessage({
        type: 'lobby_result',
        result: {
          success: true,
          sessionToken: 'tok',
          scene: { id: 's1', name: 'Office', type: 'office', capacity: 50, lobsters: {}, objects: [] },
        },
      });

      const sentBefore = ws.sent.length;
      await vi.advanceTimersByTimeAsync(30000); // heartbeat interval

      const heartbeats = ws.sent.slice(sentBefore).filter((s) => {
        const msg = JSON.parse(s);
        return msg.type === 'state_update' || msg.type === 'budget_report';
      });
      expect(heartbeats.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('message handling', () => {
    it('routes dialogue_invitation to gateway', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      const inviteSpy = vi.fn();
      client.on('dialogue_invitation', inviteSpy);
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      wsInstances[0].simulateMessage({
        type: 'dialogue_invitation',
        invitation: {
          sessionId: 'sess-1',
          from: {
            lobsterId: 'l1',
            profile: {
              lobsterId: 'l1',
              displayName: 'Alice',
              avatar: '',
              bio: '',
              skillTags: [],
              personalitySnippet: '',
              status: 'online',
              partition: 'public',
            },
          },
          intent: 'chat',
          type: 'social',
        },
      });

      expect(inviteSpy).toHaveBeenCalledOnce();
    });

    it('routes dialogue_message to gateway', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      const msgSpy = vi.fn();
      client.on('dialogue_message', msgSpy);
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      wsInstances[0].simulateMessage({
        type: 'dialogue_message',
        sessionId: 'sess-1',
        from: 'l1',
        content: 'Hello!',
        turnNumber: 1,
      });

      expect(msgSpy).toHaveBeenCalledOnce();
    });

    it('routes budget_warning events', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      const budgetSpy = vi.fn();
      client.on('budget_warning', budgetSpy);
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      wsInstances[0].simulateMessage({
        type: 'budget_warning',
        level: 'warning',
        tokensUsed: 40000,
        tokensLimit: 50000,
        sessionsUsed: 5,
        sessionsLimit: 20,
      });

      expect(budgetSpy).toHaveBeenCalledOnce();
    });
  });

  describe('sending messages', () => {
    it('sendDialogueMessage applies output filter and sends', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      const ws = wsInstances[0];
      // Complete join
      ws.simulateMessage({ type: 'auth_challenge', challenge: { nonce: 'n', timestamp: Date.now() } });
      ws.simulateMessage({
        type: 'lobby_result',
        result: { success: true, sessionToken: 'tok', scene: { id: 's1', name: 'Office', type: 'office', capacity: 50, lobsters: {}, objects: [] } },
      });

      const sentBefore = ws.sent.length;
      client.sendDialogueMessage('sess-1', 'Hello world');

      const newMessages = ws.sent.slice(sentBefore);
      expect(newMessages).toHaveLength(1);
      const msg = JSON.parse(newMessages[0]);
      expect(msg.type).toBe('dialogue_message');
      expect(msg.content).toBe('Hello world');
    });

    it('redacts sensitive content via output filter', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      const ws = wsInstances[0];
      ws.simulateMessage({ type: 'auth_challenge', challenge: { nonce: 'n', timestamp: Date.now() } });
      ws.simulateMessage({
        type: 'lobby_result',
        result: { success: true, sessionToken: 'tok', scene: { id: 's1', name: 'Office', type: 'office', capacity: 50, lobsters: {}, objects: [] } },
      });

      const sentBefore = ws.sent.length;
      client.sendDialogueMessage('sess-1', 'My key is sk-abcdefghijklmnop');

      const msg = JSON.parse(ws.sent[sentBefore]);
      expect(msg.content).not.toContain('sk-abcdefghijklmnop');
      expect(msg.content).toContain('[REDACTED]');
    });

    it('throws when sending before joined', () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      expect(() => client.sendDialogueMessage('sess-1', 'hi')).toThrow('Not connected');
    });
  });

  describe('dialogue responses', () => {
    it('acceptDialogue sends dialogue_response with accepted=true', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      const ws = wsInstances[0];
      ws.simulateMessage({ type: 'auth_challenge', challenge: { nonce: 'n', timestamp: Date.now() } });
      ws.simulateMessage({
        type: 'lobby_result',
        result: { success: true, sessionToken: 'tok', scene: { id: 's1', name: 'Office', type: 'office', capacity: 50, lobsters: {}, objects: [] } },
      });

      const sentBefore = ws.sent.length;
      client.acceptDialogue('sess-1');

      const msg = JSON.parse(ws.sent[sentBefore]);
      expect(msg.type).toBe('dialogue_response');
      expect(msg.response.sessionId).toBe('sess-1');
      expect(msg.response.accepted).toBe(true);
    });

    it('rejectDialogue sends dialogue_response with accepted=false', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      const ws = wsInstances[0];
      ws.simulateMessage({ type: 'auth_challenge', challenge: { nonce: 'n', timestamp: Date.now() } });
      ws.simulateMessage({
        type: 'lobby_result',
        result: { success: true, sessionToken: 'tok', scene: { id: 's1', name: 'Office', type: 'office', capacity: 50, lobsters: {}, objects: [] } },
      });

      const sentBefore = ws.sent.length;
      client.rejectDialogue('sess-1', 'Busy');

      const msg = JSON.parse(ws.sent[sentBefore]);
      expect(msg.type).toBe('dialogue_response');
      expect(msg.response.accepted).toBe(false);
      expect(msg.response.reason).toBe('Busy');
    });
  });

  describe('getLobsterId', () => {
    it('returns lobsterId derived from public key (available immediately)', () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      const id = client.getLobsterId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id!.startsWith('lobster-')).toBe(true);
    });
  });

  describe('getSessionToken', () => {
    it('returns null before joining', () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      expect(client.getSessionToken()).toBeNull();
    });

    it('returns session token after successful join', async () => {
      const client = new SocialProxyClient(TEST_CONFIG, createMockWsFactory());
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      const ws = wsInstances[0];
      ws.simulateMessage({ type: 'auth_challenge', challenge: { nonce: 'n', timestamp: Date.now() } });
      ws.simulateMessage({
        type: 'lobby_result',
        result: { success: true, sessionToken: 'tok-abc', scene: { id: 's1', name: 'Office', type: 'office', capacity: 50, lobsters: {}, objects: [] } },
      });

      expect(client.getSessionToken()).toBe('tok-abc');
    });
  });
});
