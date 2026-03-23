import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { WorldSnapshot } from '@lobster-world/protocol';
import { API_RATE_LIMIT_PER_MIN } from '@lobster-world/protocol';
import type { LobsterRegistry } from '../engine/registry.js';
import type { SceneEngine } from '../engine/scene.js';
import type { DialogueRouter } from '../engine/dialogue.js';
import type { ConnectionManager } from '../ws/connection-manager.js';
import type { LobbyManager } from '../engine/lobby.js';

export interface LobsterApiDeps {
  registry: LobsterRegistry;
  scene: SceneEngine;
  dialogue: DialogueRouter;
  connections: ConnectionManager;
  lobbyManager: LobbyManager;
}

const RATE_LIMIT_WINDOW_MS = 60000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function registerLobsterApiRoutes(app: FastifyInstance, deps: LobsterApiDeps): void {
  const { registry, scene, dialogue } = deps;
  const rateLimits = new Map<string, RateLimitEntry>();

  function checkRateLimit(request: FastifyRequest, reply: FastifyReply): boolean {
    const token = request.headers['x-session-token'] as string | undefined;
    const key = token ?? request.ip;

    const now = Date.now();
    let entry = rateLimits.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      rateLimits.set(key, entry);
    }

    entry.count++;

    if (entry.count > API_RATE_LIMIT_PER_MIN) {
      reply.status(429).send({ error: 'Rate limit exceeded' });
      return false;
    }

    return true;
  }

  // --- GET /api/world ---
  app.get('/api/world', async (request, reply) => {
    if (!checkRateLimit(request, reply)) return;

    const sceneData = scene.getScene();
    const lobsters = Object.values(sceneData.lobsters).map((l) => ({
      id: l.id,
      displayName: l.profile.name,
      color: l.profile.color,
      status: l.status,
      activity: l.activity,
      source: l.source ?? 'demo',
      position: l.position,
    }));

    const snapshot: WorldSnapshot = {
      sceneId: sceneData.id,
      sceneName: sceneData.name,
      lobsters,
      activeDialogues: dialogue.getActiveSessions().length,
      totalConnections: lobsters.length,
      timestamp: Date.now(),
    };

    return snapshot;
  });

  // --- GET /api/lobsters/:id ---
  app.get('/api/lobsters/:id', async (request, reply) => {
    if (!checkRateLimit(request, reply)) return;

    const { id } = request.params as { id: string };
    const lobster = registry.getLobster(id);
    if (!lobster) {
      return reply.status(404).send({ error: 'Lobster not found' });
    }
    return lobster;
  });

  // --- POST /api/lobsters/:id/invite ---
  app.post('/api/lobsters/:id/invite', async (request, reply) => {
    if (!checkRateLimit(request, reply)) return;

    const { id } = request.params as { id: string };
    const body = request.body as { intent?: string; fromId?: string } | null;

    if (!body?.intent || !body?.fromId) {
      return reply.status(400).send({ error: 'intent and fromId are required' });
    }

    const target = registry.getLobster(id);
    if (!target) {
      return reply.status(404).send({ error: 'Lobster not found' });
    }

    const from = registry.getLobster(body.fromId);
    if (!from) {
      return reply.status(404).send({ error: 'Source lobster not found' });
    }

    return {
      status: 'invitation_sent',
      targetId: id,
      fromId: body.fromId,
      intent: body.intent,
    };
  });
}
