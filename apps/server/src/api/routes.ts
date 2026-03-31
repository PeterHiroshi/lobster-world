import type { FastifyInstance } from 'fastify';
import type { TaskStatus, TaskPriority, MessageType, MemoryCategory, CodeSubmissionStatus, A2AMessageType, LobsterSkin } from '@lobster-world/protocol';
import type { LobsterRegistry } from '../engine/registry.js';
import type { SceneEngine } from '../engine/scene.js';
import type { DialogueRouter } from '../engine/dialogue.js';
import type { ConnectionManager } from '../ws/connection-manager.js';
import type { AuditLog } from '../engine/audit-log.js';
import type { WorkforceManager } from '../engine/workforce.js';
import type { TaskEngine } from '../engine/tasks.js';
import type { CommsEngine } from '../engine/comms.js';
import type { EventProcessor } from '../engine/events.js';
import type { DocManager } from '../engine/docs.js';
import type { CodeReviewManager } from '../engine/code-review.js';
import type { A2ARouter } from '../engine/a2a-router.js';
import type { KeyStore } from '../engine/key-store.js';

export interface RoutesDeps {
  registry: LobsterRegistry;
  scene: SceneEngine;
  dialogue: DialogueRouter;
  connections: ConnectionManager;
  auditLog?: AuditLog;
  workforce?: WorkforceManager;
  tasks?: TaskEngine;
  comms?: CommsEngine;
  events?: EventProcessor;
  docs?: DocManager;
  codeReview?: CodeReviewManager;
  a2aRouter?: A2ARouter;
  keyStore?: KeyStore;
}

export function registerRoutes(app: FastifyInstance, deps: RoutesDeps): void {
  const { registry, scene, dialogue, connections, auditLog, workforce, tasks, comms, events, docs, codeReview, a2aRouter, keyStore } = deps;

  // --- Existing routes ---

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

  if (auditLog) {
    app.get('/api/audit', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            count: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          },
        },
      },
    }, async (request) => {
      const { count } = request.query as { count?: number };
      return await auditLog.getRecent(count ?? 100);
    });
  }

  // --- Agent/Workforce routes ---

  if (workforce) {
    app.get('/api/agents', async () => {
      return workforce.getAllAgents();
    });

    app.get('/api/agents/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const agent = workforce.getAgent(id);
      if (!agent) {
        return reply.status(404).send({ error: 'Agent not found' });
      }
      return agent;
    });

    app.post('/api/agents', {
      schema: {
        body: {
          type: 'object',
          required: ['agentId', 'roleId'],
          properties: {
            agentId: { type: 'string', minLength: 1 },
            roleId: { type: 'string', minLength: 1 },
          },
        },
      },
    }, async (request, reply) => {
      const { agentId, roleId } = request.body as { agentId: string; roleId: string };
      const agent = workforce.registerAgent(agentId, roleId);
      if (!agent) {
        return reply.status(400).send({ error: 'Invalid roleId' });
      }
      return reply.status(201).send(agent);
    });
  }

  // --- Task routes ---

  if (tasks) {
    app.get('/api/tasks', async (request) => {
      const { status, assignee, project } = request.query as {
        status?: TaskStatus;
        assignee?: string;
        project?: string;
      };
      if (status) return await tasks.getTasksByStatus(status);
      if (assignee) return await tasks.getTasksByAssignee(assignee);
      if (project) return await tasks.getTasksByProject(project);
      return await tasks.getAllTasks();
    });

    app.get('/api/tasks/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const task = await tasks.getTask(id);
      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      return task;
    });

    app.post('/api/tasks', async (request, reply) => {
      const body = request.body as {
        projectId: string;
        title: string;
        description: string;
        priority: TaskPriority;
        createdBy: string;
        assigneeId?: string;
      };
      if (!body.projectId || !body.title || !body.createdBy) {
        return reply.status(400).send({ error: 'projectId, title, and createdBy are required' });
      }
      const task = await tasks.createTask({
        projectId: body.projectId,
        title: body.title,
        description: body.description ?? '',
        priority: body.priority ?? 'medium',
        createdBy: body.createdBy,
        assigneeId: body.assigneeId,
      });
      return reply.status(201).send(task);
    });

    app.put('/api/tasks/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { title?: string; description?: string; priority?: TaskPriority };
      const task = await tasks.updateTask(id, body);
      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      return task;
    });

    app.post('/api/tasks/:id/transition', async (request, reply) => {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: TaskStatus };
      if (!status) {
        return reply.status(400).send({ error: 'status is required' });
      }
      const task = await tasks.transitionStatus(id, status);
      if (!task) {
        return reply.status(400).send({ error: 'Invalid transition or task not found' });
      }
      return task;
    });
  }

  // --- Message routes ---

  if (comms) {
    app.post('/api/messages', async (request, reply) => {
      const body = request.body as {
        from: string;
        to: string;
        type: MessageType;
        content: string;
        context?: { taskId?: string; docId?: string };
      };
      if (!body.from || !body.to || !body.content) {
        return reply.status(400).send({ error: 'from, to, and content are required' });
      }
      const msg = await comms.sendMessage(
        body.from,
        body.to,
        body.type ?? 'direct',
        body.content,
        body.context,
      );
      return reply.status(201).send(msg);
    });

    // --- Meeting routes ---

    app.get('/api/meetings', async () => {
      return await comms.getActiveMeetings();
    });

    app.get('/api/meetings/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const meeting = await comms.getMeeting(id);
      if (!meeting) {
        return reply.status(404).send({ error: 'Meeting not found' });
      }
      return meeting;
    });

    app.post('/api/meetings', async (request, reply) => {
      const { topic, participants } = request.body as { topic: string; participants: string[] };
      if (!topic || !participants?.length) {
        return reply.status(400).send({ error: 'topic and participants are required' });
      }
      const meeting = await comms.createMeeting(topic, participants);
      return reply.status(201).send(meeting);
    });
  }

  // --- Task Assign route ---

  if (tasks) {
    app.post('/api/tasks/:id/assign', async (request, reply) => {
      const { id } = request.params as { id: string };
      const { assigneeId } = request.body as { assigneeId?: string };
      if (!assigneeId) {
        return reply.status(400).send({ error: 'assigneeId is required' });
      }
      const task = await tasks.assignTask(id, assigneeId);
      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      return task;
    });
  }

  // --- Meeting Delete route ---

  if (comms) {
    app.delete('/api/meetings/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const meeting = await comms.endMeeting(id);
      if (!meeting) {
        return reply.status(404).send({ error: 'Meeting not found' });
      }
      return meeting;
    });
  }

  // --- Document routes ---

  if (docs) {
    app.get('/api/docs', async (request) => {
      const { category, tag } = request.query as { category?: MemoryCategory; tag?: string };
      if (category) return await docs.getDocsByCategory(category);
      if (tag) return await docs.getDocsByTag(tag);
      return await docs.getAllDocs();
    });

    app.get('/api/docs/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const doc = await docs.getDoc(id);
      if (!doc) {
        return reply.status(404).send({ error: 'Document not found' });
      }
      return doc;
    });

    app.post('/api/docs', async (request, reply) => {
      const body = request.body as {
        category?: MemoryCategory;
        title?: string;
        content?: string;
        author?: string;
        tags?: string[];
      };
      if (!body.category || !body.title || !body.content || !body.author) {
        return reply.status(400).send({ error: 'category, title, content, and author are required' });
      }
      const doc = await docs.createDoc({
        category: body.category,
        title: body.title,
        content: body.content,
        author: body.author,
        tags: body.tags ?? [],
      });
      return reply.status(201).send(doc);
    });

    app.put('/api/docs/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { title?: string; content?: string; tags?: string[]; category?: MemoryCategory };
      const doc = await docs.updateDoc(id, body);
      if (!doc) {
        return reply.status(404).send({ error: 'Document not found' });
      }
      return doc;
    });

    app.delete('/api/docs/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const deleted = await docs.deleteDoc(id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Document not found' });
      }
      return { deleted: true };
    });
  }

  // --- Code Review routes ---

  if (codeReview) {
    app.post('/api/code/submit', async (request, reply) => {
      const body = request.body as {
        title?: string;
        code?: string;
        language?: string;
        author?: string;
      };
      if (!body.title || !body.code || !body.language || !body.author) {
        return reply.status(400).send({ error: 'title, code, language, and author are required' });
      }
      const sub = await codeReview.submitCode({
        title: body.title,
        code: body.code,
        language: body.language,
        author: body.author,
      });
      return reply.status(201).send(sub);
    });

    app.get('/api/code/submissions', async (request) => {
      const { status, author } = request.query as { status?: CodeSubmissionStatus; author?: string };
      if (status) return await codeReview.getSubmissionsByStatus(status);
      if (author) return await codeReview.getSubmissionsByAuthor(author);
      return await codeReview.getAllSubmissions();
    });

    app.get('/api/code/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const sub = await codeReview.getSubmission(id);
      if (!sub) {
        return reply.status(404).send({ error: 'Submission not found' });
      }
      return sub;
    });

    app.post('/api/code/:id/review', async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        reviewerId?: string;
        status?: CodeSubmissionStatus;
        comment?: string;
      };
      if (!body.reviewerId || !body.status || !body.comment) {
        return reply.status(400).send({ error: 'reviewerId, status, and comment are required' });
      }
      const sub = await codeReview.reviewCode(id, {
        reviewerId: body.reviewerId,
        status: body.status,
        comment: body.comment,
      });
      if (!sub) {
        return reply.status(404).send({ error: 'Submission not found' });
      }
      return sub;
    });
  }

  // --- Event routes ---

  if (events) {
    app.get('/api/events', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            count: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    }, async (request) => {
      const { count } = request.query as { count?: number };
      return events.getRecent(count ?? 20);
    });
  }

  // --- A2A (Agent-to-Agent) routes ---

  if (a2aRouter) {
    app.post('/api/a2a/send', async (request, reply) => {
      const body = request.body as {
        type?: A2AMessageType;
        from?: string;
        to?: string | string[];
        payload?: Record<string, unknown>;
        correlationId?: string;
        ttl?: number;
      };
      if (!body.type || !body.from || !body.to || !body.payload) {
        return reply.status(400).send({ error: 'type, from, to, and payload are required' });
      }
      try {
        const message = await a2aRouter.sendMessage({
          type: body.type,
          from: body.from,
          to: body.to,
          payload: body.payload as Parameters<typeof a2aRouter.sendMessage>[0]['payload'],
          correlationId: body.correlationId,
          ttl: body.ttl,
        });
        return reply.status(201).send(message);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return reply.status(400).send({ error: errorMessage });
      }
    });

    app.get('/api/a2a/pending/:id', async (request) => {
      const { id } = request.params as { id: string };
      return await a2aRouter.getPending(id);
    });

    app.post('/api/a2a/ack/:msgId', async (request, reply) => {
      const { msgId } = request.params as { msgId: string };
      const { agentId } = request.body as { agentId?: string };
      if (!agentId) {
        return reply.status(400).send({ error: 'agentId is required' });
      }
      const acked = await a2aRouter.ack(msgId, agentId);
      if (!acked) {
        return reply.status(404).send({ error: 'Message not found in pending queue' });
      }
      return { acked: true };
    });

    app.get('/api/a2a/chain/:corrId', async (request) => {
      const { corrId } = request.params as { corrId: string };
      return await a2aRouter.getCorrelation(corrId);
    });

    app.get('/api/a2a/stats', async () => {
      return await a2aRouter.getStats();
    });
  }

  // --- Crypto / Key Exchange routes ---

  if (keyStore) {
    app.post('/api/crypto/keys', async (request, reply) => {
      const body = request.body as { lobsterId?: string; x25519PublicKey?: string };
      if (!body.lobsterId || !body.x25519PublicKey) {
        return reply.status(400).send({ error: 'lobsterId and x25519PublicKey are required' });
      }
      const record = await keyStore.store(body.lobsterId, body.x25519PublicKey);
      return reply.status(201).send(record);
    });

    app.get('/api/crypto/keys/:lobsterId', async (request, reply) => {
      const { lobsterId } = request.params as { lobsterId: string };
      const record = await keyStore.get(lobsterId);
      if (!record) {
        return reply.status(404).send({ error: 'Public key not found' });
      }
      return record;
    });

    app.get('/api/crypto/keys', async () => {
      return await keyStore.getAll();
    });
  }

  // --- Customization routes ---

  app.post('/api/lobsters/:id/customize', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { skin?: LobsterSkin };
    if (!body.skin || !body.skin.bodyColor) {
      return reply.status(400).send({ error: 'skin with bodyColor is required' });
    }
    const updated = registry.updateSkin(id, body.skin);
    if (!updated) {
      return reply.status(400).send({ error: 'Lobster not found or invalid skin data' });
    }
    return updated;
  });

  app.get('/api/lobsters/:id/skins', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!registry.isRegistered(id)) {
      return reply.status(404).send({ error: 'Lobster not found' });
    }
    return registry.getCustomizationPresets(id);
  });

  app.post('/api/lobsters/:id/skins', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { skin?: LobsterSkin };
    if (!body.skin || !body.skin.bodyColor || !body.skin.id) {
      return reply.status(400).send({ error: 'skin with id and bodyColor is required' });
    }
    const saved = await registry.savePreset(id, body.skin);
    if (!saved) {
      return reply.status(400).send({ error: 'Lobster not found, invalid skin, or preset limit reached' });
    }
    return reply.status(201).send({ saved: true });
  });

  app.delete('/api/lobsters/:id/skins/:skinId', async (request, reply) => {
    const { id, skinId } = request.params as { id: string; skinId: string };
    const deleted = await registry.deletePreset(id, skinId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Preset not found' });
    }
    return { deleted: true };
  });
}
