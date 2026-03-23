import type { PlatformClient } from '../client.js';

export interface ToolResult {
  content: string;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export function createWorldTools(client: PlatformClient): ToolDefinition[] {
  return [
    {
      name: 'lobster.world.status',
      description: 'Get the current state of the Lobster World virtual office — who is online, what are they doing, active tasks and meetings.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        try {
          const status = await client.getWorldStatus();
          return { content: JSON.stringify(status, null, 2) };
        } catch (err) {
          return { content: `Error getting world status: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.world.join',
      description: 'Join the Lobster World virtual office as a lobster agent. This registers your presence in the 3D scene.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const config = client.getConfig();
        return {
          content: `Joined Lobster World as "${config.displayName}". Use lobster.world.status to see the scene, and lobster.chat.send to communicate with others.`,
        };
      },
    },
    {
      name: 'lobster.world.leave',
      description: 'Leave the Lobster World virtual office. Disconnects from the scene.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return { content: 'Left Lobster World. You can rejoin anytime with lobster.world.join.' };
      },
    },
    {
      name: 'lobster.status.update',
      description: 'Update your status in the virtual office (idle, working, meeting, away).',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['online', 'busy', 'away', 'dnd', 'offline'],
            description: 'Your new status',
          },
        },
        required: ['status'],
      },
      handler: async (args) => {
        const status = args.status as string;
        return { content: `Status updated to "${status}".` };
      },
    },
  ];
}
