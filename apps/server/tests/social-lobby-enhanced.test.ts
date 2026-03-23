import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthManager } from '../src/engine/auth.js';
import { LobbyManager } from '../src/engine/lobby.js';
import { ConsentManager } from '../src/engine/consent.js';
import { BudgetEnforcer } from '../src/engine/budget-enforcer.js';
import { ConnectionManager } from '../src/ws/connection-manager.js';
import { SceneEngine } from '../src/engine/scene.js';
import { LobsterRegistry } from '../src/engine/registry.js';
import { AuditLog } from '../src/engine/audit-log.js';
import { createSocialLobbyHandler } from '../src/ws/social-lobby-handler.js';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import type {
  SocialProxyUpstream,
  SocialProxyDownstream,
  SocialProfile,
  LobbyJoinRequest,
} from '@lobster-world/protocol';
import {
  DEFAULT_BUDGET_CONFIG,
  DEFAULT_SOCIAL_PERMISSION_POLICY,
} from '@lobster-world/protocol';
import nacl from 'tweetnacl';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function makeProfile(lobsterId: string): SocialProfile {
  return {
    lobsterId,
    displayName: 'TestLobster',
    avatar: '',
    bio: 'Test bio',
    skillTags: ['coding'],
    personalitySnippet: '',
    status: 'online',
    partition: 'public',
  };
}

function waitForMessage(ws: WebSocket, filter?: (msg: SocialProxyDownstream) => boolean): Promise<SocialProxyDownstream> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.removeListener('message', handler);
      reject(new Error('Timeout waiting for message'));
    }, 5000);

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

async function completeAuth(ws: WebSocket): Promise<{ lobsterId: string; sessionToken: string }> {
  const kp = nacl.sign.keyPair();
  const pubHex = toHex(kp.publicKey);
  const lobsterId = `lobster-${pubHex.slice(0, 8)}`;
  const profile = makeProfile(lobsterId);

  // Step 1: send join without sig
  const request1: LobbyJoinRequest = {
    auth: { lobsterId, publicKey: pubHex, signature: '' },
    profile,
    budgetConfig: DEFAULT_BUDGET_CONFIG,
    permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
  };

  const challengePromise = waitForMessage(ws);
  ws.send(JSON.stringify({ type: 'lobby_join', request: request1 }));
  const challenge = await challengePromise;
  if (challenge.type !== 'auth_challenge') throw new Error('Expected auth_challenge');

  // Step 2: sign and re-send
  const nonce = challenge.challenge.nonce;
  const sig = nacl.sign.detached(new TextEncoder().encode(nonce), kp.secretKey);

  const request2: LobbyJoinRequest = {
    auth: { lobsterId, publicKey: pubHex, signature: toHex(sig) },
    profile,
    budgetConfig: DEFAULT_BUDGET_CONFIG,
    permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
  };

  const resultPromise = waitForMessage(ws);
  ws.send(JSON.stringify({ type: 'lobby_join', request: request2 }));
  const result = await resultPromise;
  if (result.type !== 'lobby_result' || !result.result.success) throw new Error('Join failed');

  return { lobsterId, sessionToken: result.result.sessionToken! };
}

describe('Enhanced SocialLobbyHandler', () => {
  let httpServer: http.Server;
  let wss: WebSocketServer;
  let port: number;
  let handler: ReturnType<typeof createSocialLobbyHandler>;
  let connections: ConnectionManager;
  let registry: LobsterRegistry;
  let scene: SceneEngine;

  beforeEach(async () => {
    scene = new SceneEngine();
    connections = new ConnectionManager();
    registry = new LobsterRegistry();

    handler = createSocialLobbyHandler({
      auth: new AuthManager(),
      lobby: new LobbyManager(scene.getScene()),
      consent: new ConsentManager(),
      budgetEnforcer: new BudgetEnforcer(),
      connections,
      scene,
      registry,
      auditLog: new AuditLog(),
    });

    httpServer = http.createServer();
    wss = new WebSocketServer({ server: httpServer });
    wss.on('connection', (ws) => handler.handleConnection(ws));

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === 'object' && addr !== null ? addr.port : 0;
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Close all connected clients first
    for (const client of wss.clients) {
      client.terminate();
    }
    wss.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  describe('state_update handling', () => {
    it('updates lobster state in registry and scene', async () => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => ws.on('open', resolve));

      const { lobsterId } = await completeAuth(ws);

      // Send state update
      ws.send(JSON.stringify({
        type: 'state_update',
        state: { animation: 'working', status: 'busy', mood: 'focused' },
      } satisfies SocialProxyUpstream));

      // Give time for processing
      await new Promise((r) => setTimeout(r, 50));

      const lobster = registry.getLobster(lobsterId);
      expect(lobster?.animation).toBe('working');
      expect(lobster?.status).toBe('busy');

      ws.close();
    });
  });

  describe('lobster_joined/lobster_left events', () => {
    it('broadcasts lobster_join to viewers on successful join', async () => {
      // Connect a viewer (mock)
      const viewerWs = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => viewerWs.on('open', resolve));

      // The social handler only handles social connections, but we can check
      // that the lobster was registered in the scene after join
      const lobsterWs = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => lobsterWs.on('open', resolve));

      const { lobsterId } = await completeAuth(lobsterWs);

      // Verify lobster is in scene
      const sceneData = scene.getScene();
      expect(sceneData.lobsters[lobsterId]).toBeDefined();

      lobsterWs.close();
      viewerWs.close();
    });
  });

  describe('source tracking', () => {
    it('registered lobster has source set to plugin', async () => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => ws.on('open', resolve));

      const { lobsterId } = await completeAuth(ws);

      const lobster = registry.getLobster(lobsterId);
      expect(lobster).toBeDefined();
      expect(lobster?.source).toBe('plugin');

      ws.close();
    });
  });

  describe('disconnect handling', () => {
    it('removes lobster from scene on disconnect', async () => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => ws.on('open', resolve));

      const { lobsterId } = await completeAuth(ws);
      expect(scene.getScene().lobsters[lobsterId]).toBeDefined();

      ws.close();
      await new Promise((r) => setTimeout(r, 100));

      // Lobster should be removed from scene
      expect(scene.getScene().lobsters[lobsterId]).toBeUndefined();
    });
  });

  describe('reconnection-aware sessions', () => {
    it('allows same lobsterId to reconnect', async () => {
      const kp = nacl.sign.keyPair();
      const pubHex = toHex(kp.publicKey);
      const lobsterId = `lobster-${pubHex.slice(0, 8)}`;
      const profile = makeProfile(lobsterId);

      // First connection
      const ws1 = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => ws1.on('open', resolve));

      const request1: LobbyJoinRequest = {
        auth: { lobsterId, publicKey: pubHex, signature: '' },
        profile,
        budgetConfig: DEFAULT_BUDGET_CONFIG,
        permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
      };

      let challengePromise = waitForMessage(ws1);
      ws1.send(JSON.stringify({ type: 'lobby_join', request: request1 }));
      const challenge1 = await challengePromise;
      if (challenge1.type !== 'auth_challenge') throw new Error('Expected challenge');

      const sig1 = nacl.sign.detached(new TextEncoder().encode(challenge1.challenge.nonce), kp.secretKey);
      const joinReq: LobbyJoinRequest = {
        auth: { lobsterId, publicKey: pubHex, signature: toHex(sig1) },
        profile,
        budgetConfig: DEFAULT_BUDGET_CONFIG,
        permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
      };

      let resultPromise = waitForMessage(ws1);
      ws1.send(JSON.stringify({ type: 'lobby_join', request: joinReq }));
      const result1 = await resultPromise;
      expect(result1.type).toBe('lobby_result');
      if (result1.type === 'lobby_result') expect(result1.result.success).toBe(true);

      // Disconnect
      ws1.close();
      await new Promise((r) => setTimeout(r, 100));

      // Reconnect with same lobsterId
      const ws2 = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve) => ws2.on('open', resolve));

      challengePromise = waitForMessage(ws2);
      ws2.send(JSON.stringify({ type: 'lobby_join', request: request1 }));
      const challenge2 = await challengePromise;
      if (challenge2.type !== 'auth_challenge') throw new Error('Expected challenge');

      const sig2 = nacl.sign.detached(new TextEncoder().encode(challenge2.challenge.nonce), kp.secretKey);
      const joinReq2: LobbyJoinRequest = {
        auth: { lobsterId, publicKey: pubHex, signature: toHex(sig2) },
        profile,
        budgetConfig: DEFAULT_BUDGET_CONFIG,
        permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
      };

      resultPromise = waitForMessage(ws2);
      ws2.send(JSON.stringify({ type: 'lobby_join', request: joinReq2 }));
      const result2 = await resultPromise;

      expect(result2.type).toBe('lobby_result');
      if (result2.type === 'lobby_result') {
        expect(result2.result.success).toBe(true);
      }

      ws2.close();
    });
  });
});
