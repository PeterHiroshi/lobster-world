import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerRoutes } from '../../src/api/routes.js';
import { LobsterRegistry } from '../../src/engine/registry.js';
import { SceneEngine } from '../../src/engine/scene.js';
import { DialogueRouter } from '../../src/engine/dialogue.js';
import { ConnectionManager } from '../../src/ws/connection-manager.js';
import { A2ARouter } from '../../src/engine/a2a-router.js';

describe('A2A REST API routes', () => {
  let app: FastifyInstance;
  let a2aRouter: A2ARouter;

  beforeAll(async () => {
    a2aRouter = new A2ARouter();
    app = Fastify({ logger: false });
    registerRoutes(app, {
      registry: new LobsterRegistry(),
      scene: new SceneEngine(),
      dialogue: new DialogueRouter(),
      connections: new ConnectionManager(),
      a2aRouter,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // --- POST /api/a2a/send ---

  describe('POST /api/a2a/send', () => {
    it('sends a message and returns 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/a2a/send',
        payload: {
          type: 'task_delegate',
          from: 'agent-a',
          to: 'agent-b',
          payload: {
            taskId: 'task-1',
            title: 'Build feature',
            description: 'Implement it',
            priority: 'medium',
          },
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toMatch(/^a2a-/);
      expect(body.type).toBe('task_delegate');
      expect(body.from).toBe('agent-a');
      expect(body.to).toBe('agent-b');
    });

    it('returns 400 for missing required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/a2a/send',
        payload: { type: 'ping', from: 'agent-a' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/required/);
    });

    it('returns 400 for validation errors (e.g. empty to)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/a2a/send',
        payload: {
          type: 'ping',
          from: 'agent-a',
          to: [],
          payload: {},
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('supports multicast', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/a2a/send',
        payload: {
          type: 'knowledge_share',
          from: 'agent-a',
          to: ['agent-b', 'agent-c'],
          payload: { topic: 'Design', content: 'Use React', tags: ['react'] },
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().to).toEqual(['agent-b', 'agent-c']);
    });

    it('preserves correlationId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/a2a/send',
        payload: {
          type: 'ping',
          from: 'agent-x',
          to: 'agent-y',
          payload: {},
          correlationId: 'corr-test',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().correlationId).toBe('corr-test');
    });
  });

  // --- GET /api/a2a/pending/:id ---

  describe('GET /api/a2a/pending/:id', () => {
    it('returns pending messages for an agent', async () => {
      // Send a fresh message
      const router = new A2ARouter();
      // Use the shared instance — messages from prior tests are in a2aRouter
      const res = await app.inject({
        method: 'GET',
        url: '/api/a2a/pending/agent-b',
      });
      expect(res.statusCode).toBe(200);
      const pending = res.json();
      expect(Array.isArray(pending)).toBe(true);
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for unknown agent', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/a2a/pending/nobody',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  // --- POST /api/a2a/ack/:msgId ---

  describe('POST /api/a2a/ack/:msgId', () => {
    it('acknowledges a pending message', async () => {
      // First send a message
      const sendRes = await app.inject({
        method: 'POST',
        url: '/api/a2a/send',
        payload: {
          type: 'ping',
          from: 'ack-sender',
          to: 'ack-receiver',
          payload: {},
        },
      });
      const msgId = sendRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/a2a/ack/${msgId}`,
        payload: { agentId: 'ack-receiver' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().acked).toBe(true);
    });

    it('returns 400 when agentId missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/a2a/ack/a2a-1',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 for unknown message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/a2a/ack/a2a-9999',
        payload: { agentId: 'agent-a' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // --- GET /api/a2a/chain/:corrId ---

  describe('GET /api/a2a/chain/:corrId', () => {
    it('returns correlation chain', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/a2a/chain/corr-test',
      });
      expect(res.statusCode).toBe(200);
      const chain = res.json();
      expect(Array.isArray(chain)).toBe(true);
      expect(chain.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty for unknown correlation', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/a2a/chain/unknown-corr',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  // --- GET /api/a2a/stats ---

  describe('GET /api/a2a/stats', () => {
    it('returns stats', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/a2a/stats',
      });
      expect(res.statusCode).toBe(200);
      const stats = res.json();
      expect(stats.totalMessages).toBeGreaterThanOrEqual(1);
      expect(stats).toHaveProperty('pendingMessages');
      expect(stats).toHaveProperty('activeCorrelations');
      expect(stats).toHaveProperty('messagesByType');
    });
  });
});
