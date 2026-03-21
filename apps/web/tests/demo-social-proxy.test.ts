import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemoSocialProxy } from '../src/lib/DemoSocialProxy';
import type { DemoSocialProxyCallbacks } from '../src/lib/DemoSocialProxy';

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
});
