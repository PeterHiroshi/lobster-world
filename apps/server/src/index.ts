import Fastify from 'fastify';
import { WebSocketServer } from 'ws';
import {
  SERVER_PORT,
  SERVER_HOST,
  SCENE_UPDATE_INTERVAL_MS,
  WS_PATH_LOBSTER,
  WS_PATH_VIEWER,
} from './config.js';
import { ConnectionManager } from './ws/connection-manager.js';
import { LobsterRegistry } from './engine/registry.js';
import { SceneEngine } from './engine/scene.js';
import { DialogueRouter } from './engine/dialogue.js';
import { CircuitBreaker } from './engine/circuit-breaker.js';
import { createLobsterHandler } from './ws/lobster-handler.js';
import { createViewerHandler } from './ws/viewer-handler.js';
import { registerRoutes } from './api/routes.js';

// --- Instantiate components ---
const connections = new ConnectionManager();
const registry = new LobsterRegistry();
const scene = new SceneEngine();
const dialogue = new DialogueRouter();
const circuitBreaker = new CircuitBreaker();

// --- Create handlers ---
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

// --- Fastify server ---
const server = Fastify({ logger: true });

registerRoutes(server, { registry, scene, dialogue, connections });

// --- WebSocket servers ---
const lobsterWss = new WebSocketServer({ noServer: true });
const viewerWss = new WebSocketServer({ noServer: true });

lobsterWss.on('connection', (ws) => {
  lobsterHandler.handleConnection(ws);
});

viewerWss.on('connection', (ws) => {
  viewerHandler.handleConnection(ws);
});

// --- Scene broadcast loop (10Hz) ---
let broadcastTimer: ReturnType<typeof setInterval> | null = null;

function startBroadcastLoop(): void {
  broadcastTimer = setInterval(() => {
    const events = scene.getPendingEvents();
    for (const event of events) {
      connections.broadcastToViewers(event);
    }
  }, SCENE_UPDATE_INTERVAL_MS);
}

function stopBroadcastLoop(): void {
  if (broadcastTimer !== null) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
}

// --- Start server ---
async function start(): Promise<void> {
  try {
    await server.listen({ port: SERVER_PORT, host: SERVER_HOST });

    // Attach WebSocket upgrade handling to the underlying HTTP server
    const httpServer = server.server;
    httpServer.on('upgrade', (request, socket, head) => {
      const { pathname } = new URL(request.url ?? '/', `http://${request.headers.host}`);

      if (pathname === WS_PATH_LOBSTER) {
        lobsterWss.handleUpgrade(request, socket, head, (ws) => {
          lobsterWss.emit('connection', ws, request);
        });
      } else if (pathname === WS_PATH_VIEWER) {
        viewerWss.handleUpgrade(request, socket, head, (ws) => {
          viewerWss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    connections.startHeartbeat();
    startBroadcastLoop();

    server.log.info(`Server listening on ${SERVER_HOST}:${SERVER_PORT}`);
    server.log.info(`WebSocket endpoints: ${WS_PATH_LOBSTER}, ${WS_PATH_VIEWER}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// --- Graceful shutdown ---
async function shutdown(): Promise<void> {
  server.log.info('Shutting down...');
  stopBroadcastLoop();
  connections.stopHeartbeat();
  lobsterWss.close();
  viewerWss.close();
  await server.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();

export {
  server,
  connections,
  registry,
  scene,
  dialogue,
  circuitBreaker,
  lobsterHandler,
  viewerHandler,
  shutdown,
};
