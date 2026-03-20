import Fastify, { type FastifyInstance } from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  UpstreamEvent,
  DownstreamEvent,
  RenderEvent,
  PublicProfile,
} from '@lobster-world/protocol';
import { ConnectionManager } from '../src/ws/connection-manager.js';
import { LobsterRegistry } from '../src/engine/registry.js';
import { SceneEngine } from '../src/engine/scene.js';
import { DialogueRouter } from '../src/engine/dialogue.js';
import { CircuitBreaker } from '../src/engine/circuit-breaker.js';
import { createLobsterHandler } from '../src/ws/lobster-handler.js';
import { createViewerHandler } from '../src/ws/viewer-handler.js';
import { registerRoutes } from '../src/api/routes.js';

// --- Helpers ---

function connectLobster(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/lobster`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function connectViewer(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/viewer`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function sendEvent(ws: WebSocket, event: UpstreamEvent): void {
  ws.send(JSON.stringify(event));
}

function waitForMessage<T = DownstreamEvent | RenderEvent>(
  ws: WebSocket,
  filter?: (msg: T) => boolean,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.removeListener('message', handler);
      reject(new Error('waitForMessage timed out after 5000ms'));
    }, 5000);

    function handler(data: WebSocket.Data): void {
      const parsed = JSON.parse(data.toString()) as T;
      if (!filter || filter(parsed)) {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        resolve(parsed);
      }
    }

    ws.on('message', handler);
  });
}

function makeProfile(id: string, name: string, color: string): PublicProfile {
  return { id, name, color, skills: [] };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Test suite ---

describe('Integration tests', () => {
  let app: FastifyInstance;
  let lobsterWss: WebSocketServer;
  let viewerWss: WebSocketServer;
  let port: number;
  let broadcastTimer: ReturnType<typeof setInterval> | null = null;

  // Components
  let connections: ConnectionManager;
  let registry: LobsterRegistry;
  let scene: SceneEngine;
  let dialogue: DialogueRouter;
  let circuitBreaker: CircuitBreaker;

  // Track all opened WebSockets for cleanup
  const openSockets: WebSocket[] = [];

  beforeAll(async () => {
    connections = new ConnectionManager();
    registry = new LobsterRegistry();
    scene = new SceneEngine();
    dialogue = new DialogueRouter();
    circuitBreaker = new CircuitBreaker();

    const lobsterHandler = createLobsterHandler({
      connections,
      registry,
      scene,
      dialogue,
      circuitBreaker,
    });

    const viewerHandler = createViewerHandler({
      connections,
      scene,
    });

    app = Fastify({ logger: false });
    registerRoutes(app, { registry, scene, dialogue, connections });

    lobsterWss = new WebSocketServer({ noServer: true });
    viewerWss = new WebSocketServer({ noServer: true });

    lobsterWss.on('connection', (ws) => {
      lobsterHandler.handleConnection(ws);
    });

    viewerWss.on('connection', (ws) => {
      viewerHandler.handleConnection(ws);
    });

    await app.listen({ port: 0, host: '127.0.0.1' });

    const addr = app.server.address();
    if (typeof addr === 'object' && addr !== null) {
      port = addr.port;
    } else {
      throw new Error('Failed to get server address');
    }

    app.server.on('upgrade', (request, socket, head) => {
      const { pathname } = new URL(
        request.url ?? '/',
        `http://${request.headers.host}`,
      );

      if (pathname === '/ws/lobster') {
        lobsterWss.handleUpgrade(request, socket, head, (ws) => {
          lobsterWss.emit('connection', ws, request);
        });
      } else if (pathname === '/ws/viewer') {
        viewerWss.handleUpgrade(request, socket, head, (ws) => {
          viewerWss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    // Start broadcast loop (100ms interval like the real server)
    broadcastTimer = setInterval(() => {
      const events = scene.getPendingEvents();
      for (const event of events) {
        connections.broadcastToViewers(event);
      }
    }, 100);
  });

  afterAll(async () => {
    if (broadcastTimer !== null) {
      clearInterval(broadcastTimer);
      broadcastTimer = null;
    }
    connections.stopHeartbeat();

    for (const ws of openSockets) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }

    lobsterWss.close();
    viewerWss.close();
    await app.close();
  });

  async function trackLobster(p: number): Promise<WebSocket> {
    const ws = await connectLobster(p);
    openSockets.push(ws);
    return ws;
  }

  async function trackViewer(p: number): Promise<WebSocket> {
    const ws = await connectViewer(p);
    openSockets.push(ws);
    return ws;
  }

  // --- 1. REST API tests ---

  describe('REST API', () => {
    it('GET /api/health returns status ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe('ok');
      expect(body).toHaveProperty('timestamp');
    });

    it('GET /api/scene returns scene with objects', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/scene' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('objects');
      expect(Array.isArray(body.objects)).toBe(true);
      expect(body.objects.length).toBeGreaterThan(0);
    });

    it('GET /api/lobsters returns empty array initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/lobsters' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    it('GET /api/dialogues returns empty array initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/dialogues' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });
  });

  // --- 2. WebSocket Lobster Connection ---

  describe('WebSocket Lobster Connection', () => {
    it('registers a lobster and receives registered response with scene', async () => {
      const ws = await trackLobster(port);

      const responsePromise = waitForMessage<DownstreamEvent>(ws, (msg) => msg.type === 'registered');

      sendEvent(ws, {
        type: 'register',
        profile: makeProfile('test-lobster-1', 'Test Lobster 1', '#ff0000'),
        token: 'token-1',
      });

      const response = await responsePromise;
      expect(response.type).toBe('registered');
      if (response.type === 'registered') {
        expect(response.lobsterId).toBe('test-lobster-1');
        expect(response.scene).toHaveProperty('id');
        expect(response.scene).toHaveProperty('objects');
      }
    });

    it('GET /api/lobsters returns the registered lobster', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/lobsters' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const found = body.find(
        (l: { id: string }) => l.id === 'test-lobster-1',
      );
      expect(found).toBeTruthy();
    });
  });

  // --- 3. WebSocket Viewer Connection ---

  describe('WebSocket Viewer Connection', () => {
    it('receives full_sync on connect', async () => {
      // Set up message listener before connecting so we don't miss the
      // full_sync that's sent immediately on connection
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/viewer`);
      openSockets.push(ws);

      const response = await waitForMessage<RenderEvent>(ws, (msg) => msg.type === 'full_sync');
      expect(response.type).toBe('full_sync');
      if (response.type === 'full_sync') {
        expect(response.scene).toHaveProperty('id');
        expect(response.scene).toHaveProperty('objects');
      }
    });
  });

  // --- 4. State Updates ---

  describe('State Updates', () => {
    it('state_update is reflected in the scene', async () => {
      const ws = await trackLobster(port);

      const regPromise = waitForMessage<DownstreamEvent>(ws, (msg) => msg.type === 'registered');
      sendEvent(ws, {
        type: 'register',
        profile: makeProfile('state-lobster', 'State Lobster', '#00ff00'),
        token: 'token-state',
      });
      await regPromise;

      sendEvent(ws, {
        type: 'state_update',
        state: {
          position: { x: 5, y: 0, z: 5 },
          animation: 'walking',
        },
      });

      // Allow time for the state update to propagate
      await delay(100);

      const res = await app.inject({ method: 'GET', url: '/api/scene' });
      const sceneData = res.json();
      const lobster = sceneData.lobsters['state-lobster'];
      expect(lobster).toBeTruthy();
      expect(lobster.position.x).toBe(5);
      expect(lobster.position.z).toBe(5);
      expect(lobster.animation).toBe('walking');
    });
  });

  // --- 5. Dialogue Flow ---

  describe('Dialogue Flow', () => {
    it('full dialogue lifecycle between two lobsters', async () => {
      const wsA = await trackLobster(port);
      const wsB = await trackLobster(port);

      // Register lobster A
      const regAPromise = waitForMessage<DownstreamEvent>(wsA, (msg) => msg.type === 'registered');
      sendEvent(wsA, {
        type: 'register',
        profile: makeProfile('lobster-a', 'Lobster A', '#0000ff'),
        token: 'token-a',
      });
      await regAPromise;

      // Register lobster B
      const regBPromise = waitForMessage<DownstreamEvent>(wsB, (msg) => msg.type === 'registered');
      sendEvent(wsB, {
        type: 'register',
        profile: makeProfile('lobster-b', 'Lobster B', '#ff00ff'),
        token: 'token-b',
      });
      await regBPromise;

      // Lobster A sends dialogue request targeting lobster B
      const invitePromise = waitForMessage<DownstreamEvent>(
        wsB,
        (msg) => msg.type === 'dialogue_invite',
      );

      sendEvent(wsA, {
        type: 'dialogue_request',
        targetId: 'lobster-b',
        intent: 'hello',
        dialogueType: 'social',
      });

      const invite = await invitePromise;
      expect(invite.type).toBe('dialogue_invite');

      let sessionId = '';
      if (invite.type === 'dialogue_invite') {
        sessionId = invite.sessionId;
        expect(invite.from.id).toBe('lobster-a');
        expect(invite.intent).toBe('hello');
        expect(invite.dialogueType).toBe('social');
      }

      // Lobster A sends a dialogue message
      const msgPromise = waitForMessage<DownstreamEvent>(
        wsB,
        (msg) => msg.type === 'dialogue_message',
      );

      sendEvent(wsA, {
        type: 'dialogue_message',
        sessionId,
        content: 'Hello lobster B, how are you?',
      });

      const dialogueMsg = await msgPromise;
      expect(dialogueMsg.type).toBe('dialogue_message');
      if (dialogueMsg.type === 'dialogue_message') {
        expect(dialogueMsg.from).toBe('lobster-a');
        expect(dialogueMsg.content).toBe('Hello lobster B, how are you?');
        expect(dialogueMsg.turnNumber).toBe(1);
      }

      // Lobster A ends the dialogue
      const endAPromise = waitForMessage<DownstreamEvent>(
        wsA,
        (msg) => msg.type === 'dialogue_ended',
      );
      const endBPromise = waitForMessage<DownstreamEvent>(
        wsB,
        (msg) => msg.type === 'dialogue_ended',
      );

      sendEvent(wsA, {
        type: 'dialogue_end',
        sessionId,
        reason: 'goodbye',
      });

      const endA = await endAPromise;
      const endB = await endBPromise;

      expect(endA.type).toBe('dialogue_ended');
      expect(endB.type).toBe('dialogue_ended');

      if (endA.type === 'dialogue_ended') {
        expect(endA.sessionId).toBe(sessionId);
        expect(endA.reason).toBe('goodbye');
        expect(endA.stats).toHaveProperty('totalTurns');
        expect(endA.stats).toHaveProperty('totalTokens');
        expect(endA.stats).toHaveProperty('duration');
        expect(endA.stats.totalTurns).toBe(1);
      }

      if (endB.type === 'dialogue_ended') {
        expect(endB.sessionId).toBe(sessionId);
        expect(endB.reason).toBe('goodbye');
        expect(endB.stats.totalTurns).toBe(1);
      }
    });
  });

  // --- 6. Viewer receives updates ---

  describe('Viewer receives updates', () => {
    it('viewer receives lobster_join when a lobster registers', async () => {
      // Drain any pending events from previous tests
      scene.getPendingEvents();
      await delay(200);

      // Create the viewer WS and listen for messages from the start
      const viewerWs = new WebSocket(`ws://127.0.0.1:${port}/ws/viewer`);
      openSockets.push(viewerWs);

      // Collect all incoming messages
      const messages: RenderEvent[] = [];
      viewerWs.on('message', (data: WebSocket.Data) => {
        messages.push(JSON.parse(data.toString()) as RenderEvent);
      });

      // Wait until the viewer WS is open and has received full_sync
      await new Promise<void>((resolve) => {
        const check = (): void => {
          if (messages.some((m) => m.type === 'full_sync')) {
            resolve();
          } else {
            setTimeout(check, 20);
          }
        };
        check();
      });

      // Now listen for lobster_join specifically for our test lobster
      const joinPromise = waitForMessage<RenderEvent>(
        viewerWs,
        (msg) =>
          msg.type === 'lobster_join' &&
          msg.lobster.id === 'viewer-test-lobster',
      );

      // Register a new lobster
      const lobsterWs = await trackLobster(port);
      const regPromise = waitForMessage<DownstreamEvent>(lobsterWs, (msg) => msg.type === 'registered');
      sendEvent(lobsterWs, {
        type: 'register',
        profile: makeProfile('viewer-test-lobster', 'Viewer Test', '#aabbcc'),
        token: 'token-viewer-test',
      });
      await regPromise;

      const joinEvent = await joinPromise;
      expect(joinEvent.type).toBe('lobster_join');
      if (joinEvent.type === 'lobster_join') {
        expect(joinEvent.lobster.id).toBe('viewer-test-lobster');
      }
    });
  });
});
