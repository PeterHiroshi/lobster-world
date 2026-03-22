import type { FastifyInstance } from 'fastify';
import type { TaskStatus, TaskPriority, MessageType } from '@lobster-world/protocol';
import type { LobsterRegistry } from '../engine/registry.js';
import type { SceneEngine } from '../engine/scene.js';
import type { DialogueRouter } from '../engine/dialogue.js';
import type { ConnectionManager } from '../ws/connection-manager.js';
import type { AuditLog } from '../engine/audit-log.js';
import type { WorkforceManager } from '../engine/workforce.js';
import type { TaskEngine } from '../engine/tasks.js';
import type { CommsEngine } from '../engine/comms.js';
import type { EventProcessor } from '../engine/events.js';

export interface RoutesDeps {
  registry: LobsterRegistry;
  scene: SceneEngine;
  dialogue: DialogueRouter;
  connections: ConnectionManager;
  auditLog: AuditLog;
  workforce: WorkforceManager;
  tasks: TaskEngine;
  comms: CommsEngine;
  events: EventProcessor;
}

export function registerRoutes(app: FastifyInstance, deps: RoutesDeps): void {
  const { registry, scene, dialogue, connections, auditLog, workforce, tasks, comms, events } = deps;

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
    return auditLog.getRecent(count ?? 100);
  });

  // --- Agent/Workforce routes ---

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

  // --- Task routes ---

  app.get('/api/tasks', async (request) => {
    const { status, assignee, project } = request.query as {
      status?: TaskStatus;
      assignee?: string;
      project?: string;
    };
    if (status) return tasks.getTasksByStatus(status);
    if (assignee) return tasks.getTasksByAssignee(assignee);
    if (project) return tasks.getTasksByProject(project);
    return tasks.getAllTasks();
  });

  app.get('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = tasks.getTask(id);
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
    const task = tasks.createTask({
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
    const task = tasks.updateTask(id, body);
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
    const task = tasks.transitionStatus(id, status);
    if (!task) {
      return reply.status(400).send({ error: 'Invalid transition or task not found' });
    }
    return task;
  });

  // --- Message routes ---

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
    const msg = comms.sendMessage(
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
    return comms.getActiveMeetings();
  });

  app.get('/api/meetings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const meeting = comms.getMeeting(id);
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
    const meeting = comms.createMeeting(topic, participants);
    return reply.status(201).send(meeting);
  });

  // --- Event routes ---

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
