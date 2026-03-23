import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { PublicProfile } from '@lobster-world/protocol';
import { LobsterRegistry } from '../src/engine/registry.js';
import { SceneEngine } from '../src/engine/scene.js';
import { DialogueRouter } from '../src/engine/dialogue.js';
import { ConnectionManager } from '../src/ws/connection-manager.js';
import { registerRoutes } from '../src/api/routes.js';

function createDeps() {
  return {
    registry: new LobsterRegistry(),
    scene: new SceneEngine(),
    dialogue: new DialogueRouter(),
    connections: new ConnectionManager(),
  };
}

function registerLobster(registry: LobsterRegistry, id: string): void {
  const profile: PublicProfile = {
    id,
    name: 'Test',
    color: '#FF0000',
    skills: ['coding'],
  };
  registry.register(profile, `token-${id}`);
}

describe('Customization REST routes', () => {
  let app: FastifyInstance;
  let deps: ReturnType<typeof createDeps>;

  beforeEach(async () => {
    deps = createDeps();
    app = Fastify();
    registerRoutes(app, deps);
    await app.ready();
    registerLobster(deps.registry, 'lobster-1');
  });

  describe('POST /api/lobsters/:id/customize', () => {
    it('applies a valid skin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/lobster-1/customize',
        payload: {
          skin: { id: 's1', lobsterId: 'lobster-1', bodyColor: '#FF6B35' },
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.skin).toBeDefined();
      expect(body.skin.bodyColor).toBe('#FF6B35');
    });

    it('returns 400 for missing skin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/lobster-1/customize',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for missing bodyColor', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/lobster-1/customize',
        payload: { skin: { id: 's1', lobsterId: 'lobster-1' } },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for unknown lobster', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/unknown/customize',
        payload: {
          skin: { id: 's1', lobsterId: 'unknown', bodyColor: '#FF6B35' },
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for invalid color', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/lobster-1/customize',
        payload: {
          skin: { id: 's1', lobsterId: 'lobster-1', bodyColor: 'not-hex' },
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/lobsters/:id/skins', () => {
    it('returns empty array initially', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/lobsters/lobster-1/skins',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it('returns 404 for unknown lobster', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/lobsters/unknown/skins',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/lobsters/:id/skins', () => {
    it('saves a preset', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/lobster-1/skins',
        payload: {
          skin: { id: 's1', lobsterId: 'lobster-1', bodyColor: '#AABBCC' },
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().saved).toBe(true);

      const getRes = await app.inject({
        method: 'GET',
        url: '/api/lobsters/lobster-1/skins',
      });
      expect(getRes.json()).toHaveLength(1);
    });

    it('returns 400 for missing skin id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/lobster-1/skins',
        payload: {
          skin: { lobsterId: 'lobster-1', bodyColor: '#AABBCC' },
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for missing bodyColor', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lobsters/lobster-1/skins',
        payload: {
          skin: { id: 's1', lobsterId: 'lobster-1' },
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/lobsters/:id/skins/:skinId', () => {
    it('deletes an existing preset', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/lobsters/lobster-1/skins',
        payload: {
          skin: { id: 's1', lobsterId: 'lobster-1', bodyColor: '#AABBCC' },
        },
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/lobsters/lobster-1/skins/s1',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().deleted).toBe(true);
    });

    it('returns 404 for non-existent preset', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/lobsters/lobster-1/skins/nonexistent',
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
