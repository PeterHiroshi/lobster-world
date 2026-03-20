import type { FastifyInstance } from 'fastify';
import type { LobsterRegistry } from '../engine/registry.js';
import type { SceneEngine } from '../engine/scene.js';
import type { DialogueRouter } from '../engine/dialogue.js';
import type { ConnectionManager } from '../ws/connection-manager.js';

export interface RoutesDeps {
  registry: LobsterRegistry;
  scene: SceneEngine;
  dialogue: DialogueRouter;
  connections: ConnectionManager;
}

export function registerRoutes(app: FastifyInstance, deps: RoutesDeps): void {
  const { registry, scene, dialogue, connections } = deps;

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
}
