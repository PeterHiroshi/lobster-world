import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { PublicProfile } from '@lobster-world/protocol';
import { LobsterRegistry } from '../src/engine/registry.js';
import { SceneEngine } from '../src/engine/scene.js';
import { DialogueRouter } from '../src/engine/dialogue.js';
import { ConnectionManager } from '../src/ws/connection-manager.js';
import { LobbyManager } from '../src/engine/lobby.js';
import { registerLobsterApiRoutes, type LobsterApiDeps } from '../src/api/lobster-api.js';
import { API_RATE_LIMIT_PER_MIN } from '@lobster-world/protocol';

function createTestDeps(): LobsterApiDeps {
  const scene = new SceneEngine();
  return {
    registry: new LobsterRegistry(),
    scene,
    dialogue: new DialogueRouter(),
    connections: new ConnectionManager(),
    lobbyManager: new LobbyManager(scene.getScene()),
  };
}

function registerTestLobster(deps: LobsterApiDeps, id: string, name: string): void {
  const profile: PublicProfile = {
    id,
    name,
    color: '#EF4444',
    skills: ['coding'],
    bio: 'Test lobster',
  };
  deps.registry.register(profile, `token-${id}`);
  deps.scene.addLobster(deps.registry.getLobster(id)!);
}

describe('Lobster API Routes', () => {
  let app: FastifyInstance;
  let deps: LobsterApiDeps;

  beforeEach(async () => {
    deps = createTestDeps();
    app = Fastify();
    registerLobsterApiRoutes(app, deps);
    await app.ready();
  });

  describe('GET /api/world', () => {
    it('returns empty world snapshot', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/world' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.sceneId).toBeDefined();
      expect(body.sceneName).toBeDefined();
      expect(body.lobsters).toEqual([]);
      expect(body.activeDialogues).toBe(0);
      expect(body.timestamp).toBeDefined();
    });

    it('returns world with lobsters', async () => {
      registerTestLobster(deps, 'l1', 'Alice');
      registerTestLobster(deps, 'l2', 'Bob');

      const res = await app.inject({ method: 'GET', url: '/api/world' });
      const body = res.json();
      expect(body.lobsters).toHaveLength(2);
      expect(body.lobsters[0].id).toBeDefined();
      expect(body.lobsters[0].displayName).toBeDefined();
      expect(body.lobsters[0].status).toBeDefined();
      expect(body.lobsters[0].position).toBeDefined();
    });
  });

  describe('GET /api/lobsters/:id', () => {
    it('returns single lobster by id', async () => {
      registerTestLobster(deps, 'l1', 'Alice');

      const res = await app.inject({ method: 'GET', url: '/api/lobsters/l1' });
      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe('l1');
    });

    it('returns 404 for unknown lobster', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/lobsters/unknown' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/lobsters/:id/invite', () => {
    it('returns 400 without intent', async () => {
      registerTestLobster(deps, 'l1', 'Alice');

      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/l1/invite',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 for unknown lobster', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/unknown/invite',
        payload: { intent: 'chat', fromId: 'l2' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('accepts valid invite request', async () => {
      registerTestLobster(deps, 'l1', 'Alice');
      registerTestLobster(deps, 'l2', 'Bob');

      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/l1/invite',
        payload: { intent: 'chat', fromId: 'l2' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('invitation_sent');
    });
  });

  describe('rate limiting', () => {
    it('returns 429 after exceeding rate limit', async () => {
      registerTestLobster(deps, 'l1', 'Alice');

      // Make API_RATE_LIMIT_PER_MIN + 1 requests
      for (let i = 0; i <= API_RATE_LIMIT_PER_MIN; i++) {
        const res = await app.inject({
          method: 'GET',
          url: '/api/world',
          headers: { 'x-session-token': 'token-l1' },
        });
        if (i === API_RATE_LIMIT_PER_MIN) {
          expect(res.statusCode).toBe(429);
        }
      }
    });
  });

  describe('session token auth', () => {
    it('authenticated routes work with valid token', async () => {
      registerTestLobster(deps, 'l1', 'Alice');

      const res = await app.inject({
        method: 'GET',
        url: '/api/lobsters/l1',
        headers: { 'x-session-token': 'token-l1' },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
