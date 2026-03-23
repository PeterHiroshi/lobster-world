import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
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
import { registerLobsterApiRoutes } from './api/lobster-api.js';
import { AuditLog } from './engine/audit-log.js';
import { AuthManager } from './engine/auth.js';
import { LobbyManager } from './engine/lobby.js';
import { ConsentManager } from './engine/consent.js';
import { BudgetEnforcer } from './engine/budget-enforcer.js';
import { WorkforceManager } from './engine/workforce.js';
import { TaskEngine } from './engine/tasks.js';
import { CommsEngine } from './engine/comms.js';
import { EventProcessor } from './engine/events.js';
import { DocManager } from './engine/docs.js';
import { CodeReviewManager } from './engine/code-review.js';
import { A2ARouter } from './engine/a2a-router.js';

export interface AppDeps {
  connections: ConnectionManager;
  registry: LobsterRegistry;
  scene: SceneEngine;
  dialogue: DialogueRouter;
  circuitBreaker: CircuitBreaker;
  auditLog: AuditLog;
  authManager: AuthManager;
  lobbyManager: LobbyManager;
  consentManager: ConsentManager;
  budgetEnforcer: BudgetEnforcer;
  workforce: WorkforceManager;
  tasks: TaskEngine;
  comms: CommsEngine;
  events: EventProcessor;
  docs: DocManager;
  codeReview: CodeReviewManager;
  a2aRouter: A2ARouter;
}

export function createDefaultDeps(): AppDeps {
  const scene = new SceneEngine();
  return {
    connections: new ConnectionManager(),
    registry: new LobsterRegistry(),
    scene,
    dialogue: new DialogueRouter(),
    circuitBreaker: new CircuitBreaker(),
    auditLog: new AuditLog(),
    authManager: new AuthManager(),
    lobbyManager: new LobbyManager(scene.getScene()),
    consentManager: new ConsentManager(),
    budgetEnforcer: new BudgetEnforcer(),
    workforce: new WorkforceManager(),
    tasks: new TaskEngine(),
    comms: new CommsEngine(),
    events: new EventProcessor(),
    docs: new DocManager(),
    codeReview: new CodeReviewManager(),
    a2aRouter: new A2ARouter(),
  };
}

export interface App {
  server: FastifyInstance;
  deps: AppDeps;
  start: () => Promise<void>;
  shutdown: () => Promise<void>;
}

export async function createApp(deps?: Partial<AppDeps>): Promise<App> {
  const d: AppDeps = { ...createDefaultDeps(), ...deps };

  // --- Handlers ---
  const lobsterHandler = createLobsterHandler({
    connections: d.connections,
    registry: d.registry,
    scene: d.scene,
    dialogue: d.dialogue,
    circuitBreaker: d.circuitBreaker,
    auditLog: d.auditLog,
  });

  const viewerHandler = createViewerHandler({
    connections: d.connections,
    scene: d.scene,
  });

  const socialLobbyHandler = createSocialLobbyHandler({
    auth: d.authManager,
    lobby: d.lobbyManager,
    consent: d.consentManager,
    budgetEnforcer: d.budgetEnforcer,
    connections: d.connections,
    scene: d.scene,
    registry: d.registry,
    auditLog: d.auditLog,
  });

  // --- Fastify server ---
  const server = Fastify({ logger: true });
  await server.register(cors, { origin: CORS_ORIGINS });

  // Health check endpoint
  server.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  // Serve static web build in production
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const webDistPath = resolve(currentDir, '../../web/dist');
  if (existsSync(webDistPath)) {
    await server.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
      wildcard: false,
    });
    // SPA fallback: serve index.html for non-API/WS routes
    server.setNotFoundHandler(async (_req, reply) => {
      return reply.sendFile('index.html');
    });
  }

  registerRoutes(server, {
    registry: d.registry,
    scene: d.scene,
    dialogue: d.dialogue,
    connections: d.connections,
    auditLog: d.auditLog,
    workforce: d.workforce,
    tasks: d.tasks,
    comms: d.comms,
    events: d.events,
    docs: d.docs,
    codeReview: d.codeReview,
    a2aRouter: d.a2aRouter,
  });
  registerLobsterApiRoutes(server, {
    registry: d.registry,
    scene: d.scene,
    dialogue: d.dialogue,
    connections: d.connections,
    lobbyManager: d.lobbyManager,
  });

  // --- WebSocket servers ---
  const lobsterWss = new WebSocketServer({ noServer: true });
  const viewerWss = new WebSocketServer({ noServer: true });
  const socialWss = new WebSocketServer({ noServer: true });

  lobsterWss.on('connection', (ws) => lobsterHandler.handleConnection(ws));
  viewerWss.on('connection', (ws) => viewerHandler.handleConnection(ws));
  socialWss.on('connection', (ws) => socialLobbyHandler.handleConnection(ws));

  // --- Broadcast loop ---
  let broadcastTimer: ReturnType<typeof setInterval> | null = null;

  function startBroadcastLoop(): void {
    broadcastTimer = setInterval(() => {
      const events = d.scene.getPendingEvents();
      for (const event of events) {
        d.connections.broadcastToViewers(event);
      }
    }, SCENE_UPDATE_INTERVAL_MS);
  }

  function stopBroadcastLoop(): void {
    if (broadcastTimer !== null) {
      clearInterval(broadcastTimer);
      broadcastTimer = null;
    }
  }

  async function start(): Promise<void> {
    await server.listen({ port: SERVER_PORT, host: SERVER_HOST });

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

    d.connections.startHeartbeat();
    startBroadcastLoop();
  }

  async function shutdown(): Promise<void> {
    server.log.info('Shutting down...');
    stopBroadcastLoop();
    d.connections.stopHeartbeat();
    lobsterWss.close();
    viewerWss.close();
    socialWss.close();
    d.consentManager.dispose();
    await server.close();
  }

  return { server, deps: d, start, shutdown };
}
