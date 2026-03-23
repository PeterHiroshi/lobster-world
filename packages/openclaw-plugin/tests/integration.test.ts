import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  SocialProxyUpstream,
  SocialProxyDownstream,
} from '@lobster-world/protocol';
import {
  DEFAULT_BUDGET_CONFIG,
  DEFAULT_SOCIAL_PERMISSION_POLICY,
} from '@lobster-world/protocol';
import { AuthManager } from '@lobster-world/server/engine/auth';
import { LobbyManager } from '@lobster-world/server/engine/lobby';
import { ConsentManager } from '@lobster-world/server/engine/consent';
import { BudgetEnforcer } from '@lobster-world/server/engine/budget-enforcer';
import { ConnectionManager } from '@lobster-world/server/ws/connection-manager';
import { SceneEngine } from '@lobster-world/server/engine/scene';
import { LobsterRegistry } from '@lobster-world/server/engine/registry';
import { AuditLog } from '@lobster-world/server/engine/audit-log';
import { createSocialLobbyHandler } from '@lobster-world/server/ws/social-lobby-handler';
import { SocialProxyClient } from '../src/client.js';
import { LobsterWorldPlugin } from '../src/plugin.js';

// We can't easily import the server internals as a separate package.
// Instead, we'll test the plugin client against a mock server that implements
// the social proxy protocol directly.

function waitForMessage(ws: WebSocket, filter?: (msg: SocialProxyDownstream) => boolean): Promise<SocialProxyDownstream> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
    function handler(data: WebSocket.Data): void {
      const msg = JSON.parse(data.toString()) as SocialProxyDownstream;
      if (!filter || filter(msg)) {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        resolve(msg);
      }
    }
    ws.on('message', handler);
  });
}

// Minimal mock server that implements auth_challenge -> lobby_result flow
function createMockSocialServer() {
  const httpServer = http.createServer();
  const wss = new WebSocketServer({ server: httpServer });
  const clients: WebSocket[] = [];
  let lastJoinRequest: SocialProxyUpstream | null = null;

  wss.on('connection', (ws) => {
    clients.push(ws);

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString()) as SocialProxyUpstream;

      if (msg.type === 'lobby_join') {
        const req = msg.request;
        if (!req.auth.signature) {
          // Send challenge
          ws.send(JSON.stringify({
            type: 'auth_challenge',
            challenge: { nonce: 'test-nonce-fixed', timestamp: Date.now() },
          }));
        } else {
          lastJoinRequest = msg;
          // Accept join
          ws.send(JSON.stringify({
            type: 'lobby_result',
            result: {
              success: true,
              sessionToken: `tok-${Date.now()}`,
              scene: {
                id: 's1',
                name: 'Mock Office',
                type: 'office',
                capacity: 50,
                lobsters: {},
                objects: [],
              },
            },
          }));
        }
      }
    });
  });

  return {
    httpServer,
    wss,
    clients,
    getLastJoinRequest: () => lastJoinRequest,
    start: (): Promise<number> => new Promise((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
        resolve(port);
      });
    }),
    stop: (): Promise<void> => {
      for (const client of clients) client.terminate();
      wss.close();
      return new Promise((resolve) => httpServer.close(() => resolve()));
    },
  };
}

describe('Integration: Plugin Client -> Server', () => {
  let server: ReturnType<typeof createMockSocialServer>;
  let port: number;

  beforeEach(async () => {
    server = createMockSocialServer();
    port = await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('plugin client connects to server and completes auth flow', async () => {
    const client = new SocialProxyClient(
      {
        serverUrl: `ws://localhost:${port}`,
        displayName: 'IntegrationBot',
        bio: 'Testing',
        color: '#EF4444',
        skills: ['coding'],
      },
      (url) => new WebSocket(url) as never,
    );

    const joined = new Promise<void>((resolve) => {
      client.on('joined', resolve);
    });

    client.connect();
    await joined;

    expect(client.getState()).toBe('joined');
    expect(client.getSessionToken()).toBeDefined();
    expect(client.getScene()).toBeDefined();
    expect(client.getScene()!.name).toBe('Mock Office');

    client.disconnect();
  });

  it('plugin sends correct lobby_join with profile data', async () => {
    const client = new SocialProxyClient(
      {
        serverUrl: `ws://localhost:${port}`,
        displayName: 'ProfileBot',
        bio: 'My bio',
        color: '#3B82F6',
        skills: ['design', 'writing'],
        permissionPreset: 'open',
        dailyTokenLimit: 30000,
        sessionTokenLimit: 3000,
      },
      (url) => new WebSocket(url) as never,
    );

    const joined = new Promise<void>((resolve) => {
      client.on('joined', resolve);
    });

    client.connect();
    await joined;

    const joinReq = server.getLastJoinRequest();
    expect(joinReq).toBeDefined();
    if (joinReq && joinReq.type === 'lobby_join') {
      expect(joinReq.request.profile.displayName).toBe('ProfileBot');
      expect(joinReq.request.profile.bio).toBe('My bio');
      expect(joinReq.request.profile.skillTags).toEqual(['design', 'writing']);
      expect(joinReq.request.budgetConfig.daily.maxTokens).toBe(30000);
      expect(joinReq.request.budgetConfig.perSession.maxTokens).toBe(3000);
    }

    client.disconnect();
  });

  it('plugin can send dialogue messages after joining', async () => {
    const client = new SocialProxyClient(
      {
        serverUrl: `ws://localhost:${port}`,
        displayName: 'ChatBot',
      },
      (url) => new WebSocket(url) as never,
    );

    const joined = new Promise<void>((resolve) => {
      client.on('joined', resolve);
    });

    client.connect();
    await joined;

    // Set up message listener BEFORE sending
    const serverWs = server.clients[0];
    const msgPromise = new Promise<SocialProxyUpstream>((resolve) => {
      serverWs.on('message', (data) => {
        const msg = JSON.parse(data.toString()) as SocialProxyUpstream;
        if (msg.type === 'dialogue_message') resolve(msg);
      });
    });

    // Send a message
    client.sendDialogueMessage('sess-1', 'Hello from plugin!');

    const received = await msgPromise;
    expect(received.type).toBe('dialogue_message');
    if (received.type === 'dialogue_message') {
      expect(received.content).toBe('Hello from plugin!');
      expect(received.sessionId).toBe('sess-1');
    }

    client.disconnect();
  });

  it('LobsterWorldPlugin full lifecycle', async () => {
    const plugin = new LobsterWorldPlugin(
      {
        serverUrl: `ws://localhost:${port}`,
        displayName: 'PluginBot',
        autoConnect: true,
      },
      (url) => new WebSocket(url) as never,
    );

    const joined = new Promise<void>((resolve) => {
      plugin.on('joined', resolve);
    });

    plugin.activate();
    await joined;

    expect(plugin.getClient()!.getState()).toBe('joined');
    expect(plugin.getTools().length).toBeGreaterThan(0);

    const meta = plugin.getMetadata();
    expect(meta.id).toBe('lobster-world');

    plugin.deactivate();
    expect(plugin.getClient()!.getState()).toBe('disconnected');
  });

  it('two clients can join the same server', async () => {
    const client1 = new SocialProxyClient(
      { serverUrl: `ws://localhost:${port}`, displayName: 'Bot1' },
      (url) => new WebSocket(url) as never,
    );
    const client2 = new SocialProxyClient(
      { serverUrl: `ws://localhost:${port}`, displayName: 'Bot2' },
      (url) => new WebSocket(url) as never,
    );

    const joined1 = new Promise<void>((resolve) => client1.on('joined', resolve));
    const joined2 = new Promise<void>((resolve) => client2.on('joined', resolve));

    client1.connect();
    await joined1;

    client2.connect();
    await joined2;

    expect(client1.getState()).toBe('joined');
    expect(client2.getState()).toBe('joined');
    expect(server.clients).toHaveLength(2);

    client1.disconnect();
    client2.disconnect();
  });
});
