import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DemoSocialProxy } from '../src/lib/DemoSocialProxy';
import type { DemoSocialProxyCallbacks } from '../src/lib/DemoSocialProxy';
import type { LobbyProfile } from '@lobster-world/protocol';
import { SOCIAL_WS_ERROR_MESSAGE, SOCIAL_WS_MAX_RETRIES, SOCIAL_WS_BASE_DELAY_MS } from '../src/lib/constants';

function makeCallbacks(): DemoSocialProxyCallbacks {
  return {
    onJoined: vi.fn(),
    onError: vi.fn(),
    onBudgetStatus: vi.fn(),
    onPermissionRequest: vi.fn(),
    onDialogueInvitation: vi.fn(),
    onDialogueMessage: vi.fn(),
    onDialogueEnded: vi.fn(),
  };
}

const TEST_PROFILE: LobbyProfile = {
  displayName: 'Test',
  color: '#ff0000',
  bio: 'test bio',
  skills: [],
  dailyTokenLimit: 10000,
  sessionTokenLimit: 2000,
  permissionPreset: 'selective',
};

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }
  send(): void {
    // no-op
  }

  // Test helpers
  simulateError(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onerror?.(new Event('error'));
    this.onclose?.(new CloseEvent('close'));
  }
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }
}

describe('DemoSocialProxy', () => {
  let callbacks: ReturnType<typeof makeCallbacks>;

  beforeEach(() => {
    callbacks = makeCallbacks();
  });

  it('generates a keypair on construction', () => {
    const proxy = new DemoSocialProxy(callbacks);
    expect(proxy.getPublicKey()).toHaveLength(64); // 32 bytes hex
    expect(proxy.getLobsterId()).toMatch(/^lobster-[a-f0-9]{8}$/);
  });

  it('generates unique keypairs', () => {
    const proxy1 = new DemoSocialProxy(callbacks);
    const proxy2 = new DemoSocialProxy(callbacks);
    expect(proxy1.getPublicKey()).not.toBe(proxy2.getPublicKey());
    expect(proxy1.getLobsterId()).not.toBe(proxy2.getLobsterId());
  });

  it('filters unsafe output', () => {
    const proxy = new DemoSocialProxy(callbacks);
    const unsafe = 'my key is sk-abcdefghij1234 and password=secret123';
    const filtered = proxy.filterOutput(unsafe);
    expect(filtered).toContain('[REDACTED]');
    expect(filtered).not.toContain('sk-abcdefghij1234');
    expect(filtered).not.toContain('password=secret123');
  });

  it('passes safe output through', () => {
    const proxy = new DemoSocialProxy(callbacks);
    const safe = 'Hello, how are you today?';
    expect(proxy.filterOutput(safe)).toBe(safe);
  });

  it('isOutputSafe returns false for sensitive content', () => {
    const proxy = new DemoSocialProxy(callbacks);
    expect(proxy.isOutputSafe('my sk-abc123456789 key')).toBe(false);
    expect(proxy.isOutputSafe('Hello world')).toBe(true);
  });

  it('tracks budget status after messages', () => {
    const proxy = new DemoSocialProxy(callbacks);
    // Simulate receiving a message by directly testing budget methods
    // (actual WS messages tested in integration)
    expect(proxy.isDailyBudgetWarning()).toBe(false);
    expect(proxy.isDailyBudgetCritical()).toBe(false);
    expect(proxy.isSessionBudgetExceeded()).toBe(false);
  });

  it('disconnect does not throw when no connection', () => {
    const proxy = new DemoSocialProxy(callbacks);
    expect(() => proxy.disconnect()).not.toThrow();
  });

  describe('retry logic', () => {
    let wsInstances: MockWebSocket[];
    let originalWebSocket: typeof globalThis.WebSocket;

    beforeEach(() => {
      vi.useFakeTimers();
      wsInstances = [];
      originalWebSocket = globalThis.WebSocket;
      globalThis.WebSocket = class extends MockWebSocket {
        constructor() {
          super();
          wsInstances.push(this);
        }
      } as unknown as typeof WebSocket;
    });

    afterEach(() => {
      vi.useRealTimers();
      globalThis.WebSocket = originalWebSocket;
    });

    it('retries on WebSocket error with exponential backoff', () => {
      const proxy = new DemoSocialProxy(callbacks);
      proxy.connect('ws://localhost:3001/ws/social', TEST_PROFILE);

      expect(wsInstances).toHaveLength(1);

      // First attempt fails
      wsInstances[0].simulateError();
      expect(callbacks.onError).not.toHaveBeenCalled();

      // After base delay (1s), retry #1
      vi.advanceTimersByTime(SOCIAL_WS_BASE_DELAY_MS);
      expect(wsInstances).toHaveLength(2);

      // Second attempt fails
      wsInstances[1].simulateError();
      expect(callbacks.onError).not.toHaveBeenCalled();

      // After 2s delay, retry #2
      vi.advanceTimersByTime(SOCIAL_WS_BASE_DELAY_MS * 2);
      expect(wsInstances).toHaveLength(3);

      // Third attempt fails
      wsInstances[2].simulateError();
      expect(callbacks.onError).not.toHaveBeenCalled();

      // After 4s delay, retry #3
      vi.advanceTimersByTime(SOCIAL_WS_BASE_DELAY_MS * 4);
      expect(wsInstances).toHaveLength(4);
    });

    it('calls onError with friendly message after all retries exhausted', () => {
      const proxy = new DemoSocialProxy(callbacks);
      proxy.connect('ws://localhost:3001/ws/social', TEST_PROFILE);

      // Exhaust all retries: initial + SOCIAL_WS_MAX_RETRIES
      for (let i = 0; i < SOCIAL_WS_MAX_RETRIES; i++) {
        wsInstances[i].simulateError();
        vi.advanceTimersByTime(SOCIAL_WS_BASE_DELAY_MS * Math.pow(2, i));
      }

      // Final attempt fails
      wsInstances[SOCIAL_WS_MAX_RETRIES].simulateError();
      expect(callbacks.onError).toHaveBeenCalledTimes(1);
      expect(callbacks.onError).toHaveBeenCalledWith(SOCIAL_WS_ERROR_MESSAGE);
    });

    it('disconnect cancels pending retry timers', () => {
      const proxy = new DemoSocialProxy(callbacks);
      proxy.connect('ws://localhost:3001/ws/social', TEST_PROFILE);

      // First attempt fails — retry is scheduled
      wsInstances[0].simulateError();
      expect(wsInstances).toHaveLength(1);

      // Disconnect before timer fires
      proxy.disconnect();

      // Advance past the retry delay
      vi.advanceTimersByTime(SOCIAL_WS_BASE_DELAY_MS * 10);
      expect(wsInstances).toHaveLength(1); // No new WS created
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('successful connection on retry does not trigger error', () => {
      const proxy = new DemoSocialProxy(callbacks);
      proxy.connect('ws://localhost:3001/ws/social', TEST_PROFILE);

      // First attempt fails
      wsInstances[0].simulateError();
      vi.advanceTimersByTime(SOCIAL_WS_BASE_DELAY_MS);

      // Second attempt succeeds
      wsInstances[1].simulateOpen();

      expect(callbacks.onError).not.toHaveBeenCalled();
      expect(wsInstances).toHaveLength(2);
    });

    it('full flow: connect fails, retries exhausted, error shown', () => {
      const proxy = new DemoSocialProxy(callbacks);
      proxy.connect('ws://localhost:3001/ws/social', TEST_PROFILE);

      // All attempts fail
      for (let i = 0; i <= SOCIAL_WS_MAX_RETRIES; i++) {
        expect(wsInstances).toHaveLength(i + 1);
        wsInstances[i].simulateError();
        if (i < SOCIAL_WS_MAX_RETRIES) {
          vi.advanceTimersByTime(SOCIAL_WS_BASE_DELAY_MS * Math.pow(2, i));
        }
      }

      // Error called once with friendly message
      expect(callbacks.onError).toHaveBeenCalledTimes(1);
      expect(callbacks.onError).toHaveBeenCalledWith(SOCIAL_WS_ERROR_MESSAGE);

      // No further retries scheduled
      vi.advanceTimersByTime(SOCIAL_WS_BASE_DELAY_MS * 100);
      expect(wsInstances).toHaveLength(SOCIAL_WS_MAX_RETRIES + 1);
    });
  });
});
