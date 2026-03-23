import type { PlatformClient } from '../client.js';
import type { ToolDefinition } from './world.js';

export function createTaskTools(client: PlatformClient): ToolDefinition[] {
  return [
    {
      name: 'lobster.tasks.list',
      description: 'List tasks in Lobster World. Optionally filter by status or assignee.',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['todo', 'doing', 'review', 'done'],
            description: 'Filter by task status',
          },
          assignee: {
            type: 'string',
            description: 'Filter by assignee ID',
          },
        },
      },
      handler: async (args) => {
        try {
          const tasks = await client.getTasks({
            status: args.status as string | undefined,
            assignee: args.assignee as string | undefined,
          });
          return { content: JSON.stringify(tasks, null, 2) };
        } catch (err) {
          return { content: `Error listing tasks: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.tasks.create',
      description: 'Create a new task in Lobster World.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Task priority',
          },
          projectId: { type: 'string', description: 'Project ID (defaults to "default")' },
          assigneeId: { type: 'string', description: 'Optional assignee ID' },
        },
        required: ['title'],
      },
      handler: async (args) => {
        try {
          const task = await client.createTask({
            projectId: (args.projectId as string) ?? 'default',
            title: args.title as string,
            description: (args.description as string) ?? '',
            priority: (args.priority as 'low' | 'medium' | 'high' | 'urgent') ?? 'medium',
            createdBy: client.getConfig().displayName,
            assigneeId: args.assigneeId as string | undefined,
          });
          return { content: JSON.stringify(task, null, 2) };
        } catch (err) {
          return { content: `Error creating task: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.tasks.update',
      description: 'Update a task — change its title, description, priority, or status.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID to update' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'New priority',
          },
          status: {
            type: 'string',
            enum: ['todo', 'doing', 'review', 'done'],
            description: 'New status (triggers a status transition)',
          },
        },
        required: ['taskId'],
      },
      handler: async (args) => {
        try {
          const taskId = args.taskId as string;

          // Handle status transition separately
          if (args.status) {
            const task = await client.transitionTask(taskId, args.status as 'todo' | 'doing' | 'review' | 'done');
            return { content: JSON.stringify(task, null, 2) };
          }

          // Handle field updates
          const updates: Record<string, unknown> = {};
          if (args.title) updates.title = args.title;
          if (args.description) updates.description = args.description;
          if (args.priority) updates.priority = args.priority;

          const task = await client.updateTask(taskId, updates);
          return { content: JSON.stringify(task, null, 2) };
        } catch (err) {
          return { content: `Error updating task: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.tasks.assign',
      description: 'Assign a task to a specific agent/lobster.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
          assigneeId: { type: 'string', description: 'Agent/lobster ID to assign to' },
        },
        required: ['taskId', 'assigneeId'],
      },
      handler: async (args) => {
        try {
          const task = await client.assignTask(args.taskId as string, args.assigneeId as string);
          return { content: JSON.stringify(task, null, 2) };
        } catch (err) {
          return { content: `Error assigning task: ${(err as Error).message}`, isError: true };
        }
      },
    },
  ];
}
