import Fastify from 'fastify';
import cors from '@fastify/cors';
import { WebSocketServer } from 'ws';
import {
  SERVER_PORT,
  SERVER_HOST,
  SCENE_UPDATE_INTERVAL_MS,
  WS_PATH_LOBSTER,
  WS_PATH_VIEWER,
  WS_PATH_SOCIAL,
  CORS_ORIGINS,
} from './config.js';
import { ConnectionManager } from './ws/connection-manager.js';
import { LobsterRegistry } from './engine/registry.js';
import { SceneEngine } from './engine/scene.js';
import { DialogueRouter } from './engine/dialogue.js';
import { CircuitBreaker } from './engine/circuit-breaker.js';
import { createLobsterHandler } from './ws/lobster-handler.js';
import { createViewerHandler } from './ws/viewer-handler.js';
import { createSocialLobbyHandler } from './ws/social-lobby-handler.js';
import { registerRoutes } from './api/routes.js';
import { AuditLog } from './engine/audit-log.js';
import { AuthManager } from './engine/auth.js';
import { LobbyManager } from './engine/lobby.js';
import { ConsentManager } from './engine/consent.js';
import { BudgetEnforcer } from './engine/budget-enforcer.js';
import { WorkforceManager } from './engine/workforce.js';
import { TaskEngine } from './engine/tasks.js';
import { CommsEngine } from './engine/comms.js';
import { EventProcessor } from './engine/events.js';
import { startTeamScenario } from './mock/mock-team.js';

// --- Instantiate components ---
const connections = new ConnectionManager();
const registry = new LobsterRegistry();
const scene = new SceneEngine();
const dialogue = new DialogueRouter();
const circuitBreaker = new CircuitBreaker();
const auditLog = new AuditLog();
const authManager = new AuthManager();
const lobbyManager = new LobbyManager(scene.getScene());
const consentManager = new ConsentManager();
const budgetEnforcer = new BudgetEnforcer();
const workforce = new WorkforceManager();
const tasks = new TaskEngine();
const comms = new CommsEngine();
const events = new EventProcessor();

// --- Create handlers ---
const lobsterHandler = createLobsterHandler({
  connections,
  registry,
  scene,
  dialogue,
  circuitBreaker,
  auditLog,
});

const viewerHandler = createViewerHandler({
  connections,
  scene,
});

const socialLobbyHandler = createSocialLobbyHandler({
  auth: authManager,
  lobby: lobbyManager,
  consent: consentManager,
  budgetEnforcer,
  connections,
  scene,
  registry,
  auditLog,
});

// --- Fastify server ---
const server = Fastify({ logger: true });

await server.register(cors, { origin: CORS_ORIGINS });

registerRoutes(server, { registry, scene, dialogue, connections, auditLog, workforce, tasks, comms, events });

// --- WebSocket servers ---
const lobsterWss = new WebSocketServer({ noServer: true });
const viewerWss = new WebSocketServer({ noServer: true });
const socialWss = new WebSocketServer({ noServer: true });

lobsterWss.on('connection', (ws) => {
  lobsterHandler.handleConnection(ws);
});

viewerWss.on('connection', (ws) => {
  viewerHandler.handleConnection(ws);
});

socialWss.on('connection', (ws) => {
  socialLobbyHandler.handleConnection(ws);
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
      } else if (pathname === WS_PATH_SOCIAL) {
        socialWss.handleUpgrade(request, socket, head, (ws) => {
          socialWss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    connections.startHeartbeat();
    startBroadcastLoop();

    // Start team scenario (5 agents with project lifecycle)
    const serverUrl = `ws://localhost:${SERVER_PORT}`;
    const teamRunner = startTeamScenario(serverUrl, workforce, tasks, comms, events, connections);

    server.log.info(`Server listening on ${SERVER_HOST}:${SERVER_PORT}`);
    server.log.info(`WebSocket endpoints: ${WS_PATH_LOBSTER}, ${WS_PATH_VIEWER}, ${WS_PATH_SOCIAL}`);
    server.log.info('Team scenario started with 5 agents');
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
  socialWss.close();
  consentManager.dispose();
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
  auditLog,
  authManager,
  lobbyManager,
  consentManager,
  budgetEnforcer,
  workforce,
  tasks,
  comms,
  events,
  lobsterHandler,
  viewerHandler,
  socialLobbyHandler,
  shutdown,
};
