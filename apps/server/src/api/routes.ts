import type { FastifyInstance } from 'fastify';
import type { LobsterRegistry } from '../engine/registry.js';
import type { SceneEngine } from '../engine/scene.js';
import type { DialogueRouter } from '../engine/dialogue.js';
import type { ConnectionManager } from '../ws/connection-manager.js';
import type { AuditLog } from '../engine/audit-log.js';

export interface RoutesDeps {
  registry: LobsterRegistry;
  scene: SceneEngine;
  dialogue: DialogueRouter;
  connections: ConnectionManager;
  auditLog: AuditLog;
}

export function registerRoutes(app: FastifyInstance, deps: RoutesDeps): void {
  const { registry, scene, dialogue, connections, auditLog } = deps;

  app.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      lobsters: connections.getLobsterCount(),
      viewers: connections.getViewerCount(),
    };
  });

  app.get('/api/scene', async () => {
    return scene.getScene();
  });

  app.get('/api/lobsters', async () => {
    return registry.getAllLobsters();
  });

  app.get('/api/dialogues', async () => {
    return dialogue.getActiveSessions();
  });

  app.get('/api/audit', async (request) => {
    const { count } = request.query as { count?: string };
    const n = count ? Math.max(1, Math.min(1000, Number(count))) : 100;
    return auditLog.getRecent(Number.isNaN(n) ? 100 : n);
  });
}
