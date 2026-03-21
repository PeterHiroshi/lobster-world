import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  BudgetConfig,
  SocialPermissionPolicy,
  LobbyJoinRequest,
  AuthResponse,
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

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
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

function waitForMessage(ws: WebSocket): Promise<SocialProxyDownstream> {
  return new Promise((resolve) => {
    ws.once('message', (data) => {
      resolve(JSON.parse(data.toString()) as SocialProxyDownstream);
    });
  });
}

describe('SocialLobbyHandler', () => {
  let httpServer: http.Server;
  let wss: WebSocketServer;
  let port: number;
  let handler: ReturnType<typeof createSocialLobbyHandler>;
  let auth: AuthManager;
  let lobbyMgr: LobbyManager;
  let consent: ConsentManager;
  let budgetEnforcer: BudgetEnforcer;
  let connections: ConnectionManager;
  let scene: SceneEngine;
  let registry: LobsterRegistry;

  beforeEach(async () => {
    auth = new AuthManager();
    scene = new SceneEngine();
    lobbyMgr = new LobbyManager(scene.getScene());
    consent = new ConsentManager();
    budgetEnforcer = new BudgetEnforcer();
    connections = new ConnectionManager();
    registry = new LobsterRegistry();

    handler = createSocialLobbyHandler({
      auth,
      lobby: lobbyMgr,
      consent,
      budgetEnforcer,
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
    consent.dispose();
    wss.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('sends auth_challenge on lobby_join without signature', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const kp = nacl.sign.keyPair();
    const lobsterId = `lobster-${toHex(kp.publicKey).slice(0, 8)}`;

    const request: LobbyJoinRequest = {
      auth: { lobsterId, publicKey: toHex(kp.publicKey), signature: '' },
      profile: makeProfile(lobsterId),
      budgetConfig: DEFAULT_BUDGET_CONFIG,
      permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
    };

    const msgPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'lobby_join', request }));
    const msg = await msgPromise;

    expect(msg.type).toBe('auth_challenge');
    if (msg.type === 'auth_challenge') {
      expect(msg.challenge.nonce).toBeDefined();
      expect(msg.challenge.nonce.length).toBe(64); // 32 bytes hex
    }

    ws.close();
  });

  it('completes full auth flow: challenge -> sign -> lobby_result', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const kp = nacl.sign.keyPair();
    const pubHex = toHex(kp.publicKey);
    const secHex = toHex(kp.secretKey);
    const lobsterId = `lobster-${pubHex.slice(0, 8)}`;
    const profile = makeProfile(lobsterId);

    // Step 1: send lobby_join without signature
    const request1: LobbyJoinRequest = {
      auth: { lobsterId, publicKey: pubHex, signature: '' },
      profile,
      budgetConfig: DEFAULT_BUDGET_CONFIG,
      permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
    };

    const challengePromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'lobby_join', request: request1 }));
    const challenge = await challengePromise;
    expect(challenge.type).toBe('auth_challenge');

    if (challenge.type !== 'auth_challenge') return;

    // Step 2: sign nonce and re-send
    const nonce = challenge.challenge.nonce;
    const message = new TextEncoder().encode(nonce);
    const signature = nacl.sign.detached(message, kp.secretKey);
    const sigHex = toHex(signature);

    const request2: LobbyJoinRequest = {
      auth: { lobsterId, publicKey: pubHex, signature: sigHex },
      profile,
      budgetConfig: DEFAULT_BUDGET_CONFIG,
      permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
    };

    const resultPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'lobby_join', request: request2 }));
    const result = await resultPromise;

    expect(result.type).toBe('lobby_result');
    if (result.type === 'lobby_result') {
      expect(result.result.success).toBe(true);
      expect(result.result.sessionToken).toBeDefined();
      expect(result.result.scene).toBeDefined();
    }

    ws.close();
  });

  it('rejects invalid signature', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const kp = nacl.sign.keyPair();
    const pubHex = toHex(kp.publicKey);
    const lobsterId = `lobster-${pubHex.slice(0, 8)}`;

    // Step 1: get challenge
    const request1: LobbyJoinRequest = {
      auth: { lobsterId, publicKey: pubHex, signature: '' },
      profile: makeProfile(lobsterId),
      budgetConfig: DEFAULT_BUDGET_CONFIG,
      permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
    };

    const challengePromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'lobby_join', request: request1 }));
    const challenge = await challengePromise;
    expect(challenge.type).toBe('auth_challenge');

    // Step 2: send with bad signature
    const request2: LobbyJoinRequest = {
      auth: { lobsterId, publicKey: pubHex, signature: 'a'.repeat(128) },
      profile: makeProfile(lobsterId),
      budgetConfig: DEFAULT_BUDGET_CONFIG,
      permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
    };

    const resultPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'lobby_join', request: request2 }));
    const result = await resultPromise;

    expect(result.type).toBe('lobby_result');
    if (result.type === 'lobby_result') {
      expect(result.result.success).toBe(false);
    }

    ws.close();
  });

  it('rejects messages before lobby join', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const msgPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'state_update', state: {} }));
    const msg = await msgPromise;

    expect(msg.type).toBe('lobby_result');
    if (msg.type === 'lobby_result') {
      expect(msg.result.success).toBe(false);
      expect(msg.result.reason).toBe('Must join lobby first');
    }

    ws.close();
  });

  it('rejects duplicate lobby_join after already joined', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const kp = nacl.sign.keyPair();
    const pubHex = toHex(kp.publicKey);
    const lobsterId = `lobster-${pubHex.slice(0, 8)}`;
    const profile = makeProfile(lobsterId);

    // Complete auth
    const request1: LobbyJoinRequest = {
      auth: { lobsterId, publicKey: pubHex, signature: '' },
      profile,
      budgetConfig: DEFAULT_BUDGET_CONFIG,
      permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
    };

    let msgPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'lobby_join', request: request1 }));
    const challenge = await msgPromise;
    if (challenge.type !== 'auth_challenge') return;

    const nonce = challenge.challenge.nonce;
    const sig = nacl.sign.detached(new TextEncoder().encode(nonce), kp.secretKey);

    const request2: LobbyJoinRequest = {
      auth: { lobsterId, publicKey: pubHex, signature: toHex(sig) },
      profile,
      budgetConfig: DEFAULT_BUDGET_CONFIG,
      permissions: DEFAULT_SOCIAL_PERMISSION_POLICY,
    };

    msgPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'lobby_join', request: request2 }));
    const joinResult = await msgPromise;
    expect(joinResult.type).toBe('lobby_result');

    // Try to join again
    msgPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'lobby_join', request: request1 }));
    const dupResult = await msgPromise;

    expect(dupResult.type).toBe('lobby_result');
    if (dupResult.type === 'lobby_result') {
      expect(dupResult.result.success).toBe(false);
      expect(dupResult.result.reason).toBe('Already joined');
    }

    ws.close();
  });

  it('handles invalid JSON gracefully', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const msgPromise = waitForMessage(ws);
    ws.send('not json');
    const msg = await msgPromise;

    expect(msg.type).toBe('lobby_result');
    if (msg.type === 'lobby_result') {
      expect(msg.result.success).toBe(false);
      expect(msg.result.reason).toBe('Invalid JSON');
    }

    ws.close();
  });
});
