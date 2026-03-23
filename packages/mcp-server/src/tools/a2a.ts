import type { A2AMessageType, A2APayloadMap } from '@lobster-world/protocol';
import type { PlatformClient } from '../client.js';
import type { ToolDefinition } from './world.js';

export function createA2ATools(client: PlatformClient): ToolDefinition[] {
  return [
    {
      name: 'lobster.a2a.delegate',
      description: 'Delegate a task to another agent via the A2A protocol.',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Target agent ID' },
          taskId: { type: 'string', description: 'Task ID to delegate' },
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Task priority',
          },
          correlationId: { type: 'string', description: 'Optional correlation ID for tracking' },
        },
        required: ['to', 'taskId', 'title'],
      },
      handler: async (args) => {
        try {
          const msg = await client.a2aSend({
            type: 'task_delegate',
            from: client.getConfig().displayName,
            to: args.to as string,
            payload: {
              taskId: args.taskId as string,
              title: args.title as string,
              description: (args.description as string) ?? '',
              priority: (args.priority as 'low' | 'medium' | 'high' | 'urgent') ?? 'medium',
            },
            correlationId: args.correlationId as string | undefined,
          });
          return { content: JSON.stringify(msg, null, 2) };
        } catch (err) {
          return { content: `Error delegating task: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.a2a.review',
      description: 'Request a code review from another agent.',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Reviewer agent ID' },
          submissionId: { type: 'string', description: 'Code submission ID' },
          title: { type: 'string', description: 'Review title' },
          language: { type: 'string', description: 'Programming language' },
          urgency: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            description: 'Review urgency',
          },
        },
        required: ['to', 'submissionId', 'title'],
      },
      handler: async (args) => {
        try {
          const msg = await client.a2aSend({
            type: 'review_request',
            from: client.getConfig().displayName,
            to: args.to as string,
            payload: {
              submissionId: args.submissionId as string,
              title: args.title as string,
              language: (args.language as string) ?? 'unknown',
              urgency: (args.urgency as 'low' | 'normal' | 'high') ?? 'normal',
            },
          });
          return { content: JSON.stringify(msg, null, 2) };
        } catch (err) {
          return { content: `Error requesting review: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.a2a.share',
      description: 'Share knowledge with one or more agents.',
      inputSchema: {
        type: 'object',
        properties: {
          to: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
            description: 'Target agent(s)',
          },
          topic: { type: 'string', description: 'Knowledge topic' },
          content: { type: 'string', description: 'Knowledge content' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for categorization',
          },
        },
        required: ['to', 'topic', 'content'],
      },
      handler: async (args) => {
        try {
          const msg = await client.a2aSend({
            type: 'knowledge_share',
            from: client.getConfig().displayName,
            to: args.to as string | string[],
            payload: {
              topic: args.topic as string,
              content: args.content as string,
              tags: (args.tags as string[]) ?? [],
            },
          });
          return { content: JSON.stringify(msg, null, 2) };
        } catch (err) {
          return { content: `Error sharing knowledge: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.a2a.collab',
      description: 'Invite agents to a collaboration session.',
      inputSchema: {
        type: 'object',
        properties: {
          to: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
            description: 'Target agent(s) to invite',
          },
          sessionId: { type: 'string', description: 'Collaboration session ID' },
          topic: { type: 'string', description: 'Collaboration topic' },
          description: { type: 'string', description: 'What the collaboration is about' },
        },
        required: ['to', 'sessionId', 'topic'],
      },
      handler: async (args) => {
        try {
          const msg = await client.a2aSend({
            type: 'collab_invite',
            from: client.getConfig().displayName,
            to: args.to as string | string[],
            payload: {
              sessionId: args.sessionId as string,
              topic: args.topic as string,
              description: (args.description as string) ?? '',
            },
          });
          return { content: JSON.stringify(msg, null, 2) };
        } catch (err) {
          return { content: `Error inviting to collab: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.a2a.pending',
      description: 'Get pending A2A messages for the current agent.',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID (defaults to current agent)' },
        },
      },
      handler: async (args) => {
        try {
          const agentId = (args.agentId as string) ?? client.getConfig().displayName;
          const pending = await client.a2aGetPending(agentId);
          return { content: JSON.stringify(pending, null, 2) };
        } catch (err) {
          return { content: `Error getting pending: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.a2a.respond',
      description: 'Respond to an A2A message — accept/reject tasks, acknowledge knowledge, respond to reviews.',
      inputSchema: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'ID of the message to respond to' },
          responseType: {
            type: 'string',
            enum: ['task_accept', 'task_reject', 'task_update', 'task_complete', 'review_response', 'knowledge_ack', 'collab_join', 'collab_leave', 'pong'],
            description: 'Type of response',
          },
          to: { type: 'string', description: 'Target agent ID (the original sender)' },
          payload: {
            type: 'object',
            description: 'Response payload (depends on responseType)',
          },
          correlationId: { type: 'string', description: 'Correlation ID to chain with original message' },
        },
        required: ['responseType', 'to', 'payload'],
      },
      handler: async (args) => {
        try {
          const responseType = args.responseType as A2AMessageType;
          const msg = await client.a2aSend({
            type: responseType,
            from: client.getConfig().displayName,
            to: args.to as string,
            payload: args.payload as A2APayloadMap[A2AMessageType],
            correlationId: args.correlationId as string | undefined,
          });

          // Acknowledge the original message if messageId is provided
          if (args.messageId) {
            await client.a2aAck(args.messageId as string, client.getConfig().displayName);
          }

          return { content: JSON.stringify(msg, null, 2) };
        } catch (err) {
          return { content: `Error responding: ${(err as Error).message}`, isError: true };
        }
      },
    },
  ];
}
