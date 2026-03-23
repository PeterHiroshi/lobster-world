import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { LobsterWorldPlugin } from '../src/plugin.js';

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  readyState = 0;
  sent: string[] = [];

  constructor(public url: string) {
    super();
    setTimeout(() => {
      this.readyState = 1;
      this.emit('open');
    }, 10);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.emit('close', 1000, 'normal');
  }
}

let wsInstances: MockWebSocket[] = [];

function mockWsFactory(url: string) {
  const ws = new MockWebSocket(url);
  wsInstances.push(ws);
  return ws;
}

const VALID_CONFIG = {
  serverUrl: 'ws://localhost:3001/ws/social',
  displayName: 'TestBot',
  bio: 'A test lobster',
  color: '#EF4444',
  skills: ['coding' as const],
  permissionPreset: 'selective' as const,
  dailyTokenLimit: 50000,
  sessionTokenLimit: 5000,
  autoConnect: true,
};

describe('LobsterWorldPlugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    wsInstances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('config validation', () => {
    it('accepts valid config', () => {
      expect(() => new LobsterWorldPlugin(VALID_CONFIG, mockWsFactory)).not.toThrow();
    });

    it('rejects config without serverUrl', () => {
      const config = { ...VALID_CONFIG, serverUrl: '' };
      expect(() => new LobsterWorldPlugin(config, mockWsFactory)).toThrow('serverUrl');
    });

    it('rejects config without displayName', () => {
      const config = { ...VALID_CONFIG, displayName: '' };
      expect(() => new LobsterWorldPlugin(config, mockWsFactory)).toThrow('displayName');
    });

    it('rejects displayName exceeding max length', () => {
      const config = { ...VALID_CONFIG, displayName: 'A'.repeat(31) };
      expect(() => new LobsterWorldPlugin(config, mockWsFactory)).toThrow('displayName');
    });

    it('rejects bio exceeding max length', () => {
      const config = { ...VALID_CONFIG, bio: 'A'.repeat(141) };
      expect(() => new LobsterWorldPlugin(config, mockWsFactory)).toThrow('bio');
    });

    it('applies default values for optional fields', () => {
      const minConfig = { serverUrl: 'ws://localhost:3001/ws/social', displayName: 'Bot' };
      const plugin = new LobsterWorldPlugin(minConfig, mockWsFactory);
      const resolved = plugin.getConfig();
      expect(resolved.permissionPreset).toBe('selective');
      expect(resolved.dailyTokenLimit).toBe(50000);
      expect(resolved.sessionTokenLimit).toBe(5000);
      expect(resolved.autoConnect).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('activate() creates client and connects when autoConnect is true', async () => {
      const plugin = new LobsterWorldPlugin(VALID_CONFIG, mockWsFactory);
      plugin.activate();

      expect(plugin.getClient()).toBeDefined();
      expect(plugin.getClient()!.getState()).toBe('connecting');
    });

    it('activate() does not connect when autoConnect is false', () => {
      const config = { ...VALID_CONFIG, autoConnect: false };
      const plugin = new LobsterWorldPlugin(config, mockWsFactory);
      plugin.activate();

      expect(plugin.getClient()).toBeDefined();
      expect(plugin.getClient()!.getState()).toBe('disconnected');
    });

    it('deactivate() disconnects client and cleans up', async () => {
      const plugin = new LobsterWorldPlugin(VALID_CONFIG, mockWsFactory);
      plugin.activate();

      await vi.advanceTimersByTimeAsync(20);
      plugin.deactivate();

      expect(plugin.getClient()!.getState()).toBe('disconnected');
    });

    it('getTools() returns agent tools', () => {
      const plugin = new LobsterWorldPlugin(VALID_CONFIG, mockWsFactory);
      plugin.activate();

      const tools = plugin.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('getMetadata() returns plugin info', () => {
      const plugin = new LobsterWorldPlugin(VALID_CONFIG, mockWsFactory);
      const meta = plugin.getMetadata();
      expect(meta.id).toBe('lobster-world');
      expect(meta.name).toBe('Lobster World Social Proxy');
      expect(meta.version).toBe('0.1.0');
    });
  });

  describe('event forwarding', () => {
    it('forwards client events through plugin', async () => {
      const plugin = new LobsterWorldPlugin(VALID_CONFIG, mockWsFactory);
      const joinedSpy = vi.fn();
      plugin.on('joined', joinedSpy);
      plugin.activate();

      await vi.advanceTimersByTimeAsync(20);
      const ws = wsInstances[0];

      ws.emit('message', JSON.stringify({
        type: 'auth_challenge',
        challenge: { nonce: 'n', timestamp: Date.now() },
      }));

      ws.emit('message', JSON.stringify({
        type: 'lobby_result',
        result: {
          success: true,
          sessionToken: 'tok',
          scene: { id: 's1', name: 'Office', type: 'office', capacity: 50, lobsters: {}, objects: [] },
        },
      }));

      expect(joinedSpy).toHaveBeenCalledOnce();
    });
  });
});
