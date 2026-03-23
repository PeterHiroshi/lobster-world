import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerRoutes } from '../../src/api/routes.js';
import { LobsterRegistry } from '../../src/engine/registry.js';
import { SceneEngine } from '../../src/engine/scene.js';
import { DialogueRouter } from '../../src/engine/dialogue.js';
import { ConnectionManager } from '../../src/ws/connection-manager.js';
import { AuditLog } from '../../src/engine/audit-log.js';
import { WorkforceManager } from '../../src/engine/workforce.js';
import { TaskEngine } from '../../src/engine/tasks.js';
import { CommsEngine } from '../../src/engine/comms.js';
import { EventProcessor } from '../../src/engine/events.js';
import { DocManager } from '../../src/engine/docs.js';
import { CodeReviewManager } from '../../src/engine/code-review.js';

describe('New REST API routes', () => {
  let app: FastifyInstance;
  let tasks: TaskEngine;
  let comms: CommsEngine;
  let docs: DocManager;
  let codeReview: CodeReviewManager;

  beforeAll(async () => {
    tasks = new TaskEngine();
    comms = new CommsEngine();
    docs = new DocManager();
    codeReview = new CodeReviewManager();

    app = Fastify({ logger: false });
    registerRoutes(app, {
      registry: new LobsterRegistry(),
      scene: new SceneEngine(),
      dialogue: new DialogueRouter(),
      connections: new ConnectionManager(),
      auditLog: new AuditLog(),
      workforce: new WorkforceManager(),
      tasks,
      comms,
      events: new EventProcessor(),
      docs,
      codeReview,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Task Assign ---

  describe('POST /api/tasks/:id/assign', () => {
    it('assigns an agent to a task', async () => {
      const task = tasks.createTask({
        projectId: 'p1',
        title: 'Test task',
        description: 'desc',
        priority: 'medium',
        createdBy: 'agent-1',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${task.id}/assign`,
        payload: { assigneeId: 'agent-2' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.assigneeId).toBe('agent-2');
    });

    it('returns 400 when assigneeId is missing', async () => {
      const task = tasks.createTask({
        projectId: 'p1', title: 'T', description: '', priority: 'low', createdBy: 'a',
      });
      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${task.id}/assign`,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 for non-existent task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/tasks/task-999/assign',
        payload: { assigneeId: 'agent-1' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // --- Meeting Delete ---

  describe('DELETE /api/meetings/:id', () => {
    it('ends an active meeting', async () => {
      const meeting = comms.createMeeting('Standup', ['agent-1', 'agent-2']);
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/meetings/${meeting.id}`,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe('ended');
    });

    it('returns 404 for non-existent meeting', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/meetings/meeting-999',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // --- Docs CRUD ---

  describe('Docs API', () => {
    it('POST /api/docs creates a document', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/docs',
        payload: {
          category: 'architecture',
          title: 'API Design',
          content: 'RESTful patterns',
          author: 'agent-1',
          tags: ['api'],
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toMatch(/^doc-/);
      expect(body.title).toBe('API Design');
    });

    it('POST /api/docs returns 400 for missing fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/docs',
        payload: { title: 'Incomplete' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/docs lists all documents', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/docs' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it('GET /api/docs?category=architecture filters by category', async () => {
      docs.createDoc({ category: 'bugs', title: 'Bug', content: 'x', author: 'a', tags: [] });
      const res = await app.inject({ method: 'GET', url: '/api/docs?category=architecture' });
      const body = res.json();
      expect(body.every((d: { category: string }) => d.category === 'architecture')).toBe(true);
    });

    it('GET /api/docs?tag=api filters by tag', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/docs?tag=api' });
      const body = res.json();
      expect(body.length).toBeGreaterThan(0);
    });

    it('GET /api/docs/:id returns a document', async () => {
      const doc = docs.createDoc({ category: 'general', title: 'Test', content: 'c', author: 'a', tags: [] });
      const res = await app.inject({ method: 'GET', url: `/api/docs/${doc.id}` });
      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(doc.id);
    });

    it('GET /api/docs/:id returns 404 for non-existent', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/docs/doc-999' });
      expect(res.statusCode).toBe(404);
    });

    it('PUT /api/docs/:id updates a document', async () => {
      const doc = docs.createDoc({ category: 'general', title: 'Old', content: 'old', author: 'a', tags: [] });
      const res = await app.inject({
        method: 'PUT',
        url: `/api/docs/${doc.id}`,
        payload: { title: 'New', content: 'new content' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('New');
    });

    it('PUT /api/docs/:id returns 404 for non-existent', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/docs/doc-999',
        payload: { title: 'x' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('DELETE /api/docs/:id deletes a document', async () => {
      const doc = docs.createDoc({ category: 'general', title: 'Del', content: 'x', author: 'a', tags: [] });
      const res = await app.inject({ method: 'DELETE', url: `/api/docs/${doc.id}` });
      expect(res.statusCode).toBe(200);
      expect(docs.getDoc(doc.id)).toBeUndefined();
    });

    it('DELETE /api/docs/:id returns 404 for non-existent', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/docs/doc-999' });
      expect(res.statusCode).toBe(404);
    });
  });

  // --- Code Review ---

  describe('Code Review API', () => {
    it('POST /api/code/submit creates a submission', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/code/submit',
        payload: {
          title: 'Login endpoint',
          code: 'function login() {}',
          language: 'typescript',
          author: 'agent-1',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toMatch(/^code-/);
      expect(body.status).toBe('pending');
    });

    it('POST /api/code/submit returns 400 for missing fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/code/submit',
        payload: { title: 'Incomplete' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/code/submissions lists submissions', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/code/submissions' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });

    it('GET /api/code/:id returns a submission', async () => {
      const sub = codeReview.submitCode({ title: 'T', code: 'c', language: 'ts', author: 'a' });
      const res = await app.inject({ method: 'GET', url: `/api/code/${sub.id}` });
      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(sub.id);
    });

    it('GET /api/code/:id returns 404 for non-existent', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/code/code-999' });
      expect(res.statusCode).toBe(404);
    });

    it('POST /api/code/:id/review reviews a submission', async () => {
      const sub = codeReview.submitCode({ title: 'T', code: 'c', language: 'ts', author: 'a' });
      const res = await app.inject({
        method: 'POST',
        url: `/api/code/${sub.id}/review`,
        payload: {
          reviewerId: 'reviewer-1',
          status: 'approved',
          comment: 'LGTM',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('approved');
    });

    it('POST /api/code/:id/review returns 400 for missing fields', async () => {
      const sub = codeReview.submitCode({ title: 'T', code: 'c', language: 'ts', author: 'a' });
      const res = await app.inject({
        method: 'POST',
        url: `/api/code/${sub.id}/review`,
        payload: { reviewerId: 'r' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('POST /api/code/:id/review returns 404 for non-existent', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/code/code-999/review',
        payload: { reviewerId: 'r', status: 'approved', comment: 'ok' },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
