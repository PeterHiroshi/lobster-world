import type { PlatformClient } from '../client.js';
import type { ToolDefinition } from './world.js';

export function createChatTools(client: PlatformClient): ToolDefinition[] {
  return [
    {
      name: 'lobster.chat.send',
      description: 'Send a direct message to another lobster in the virtual office.',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient lobster ID' },
          content: { type: 'string', description: 'Message content' },
        },
        required: ['to', 'content'],
      },
      handler: async (args) => {
        try {
          const msg = await client.sendMessage({
            from: client.getConfig().displayName,
            to: args.to as string,
            type: 'direct',
            content: args.content as string,
          });
          return { content: `Message sent to ${args.to}: ${JSON.stringify(msg, null, 2)}` };
        } catch (err) {
          return { content: `Error sending message: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.chat.broadcast',
      description: 'Broadcast a message to all lobsters in the virtual office.',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Message to broadcast' },
        },
        required: ['content'],
      },
      handler: async (args) => {
        try {
          const msg = await client.sendMessage({
            from: client.getConfig().displayName,
            to: 'all',
            type: 'broadcast',
            content: args.content as string,
          });
          return { content: `Broadcast sent: ${JSON.stringify(msg, null, 2)}` };
        } catch (err) {
          return { content: `Error broadcasting: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.meeting.start',
      description: 'Start a meeting with specified participants in the virtual office.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Meeting topic' },
          participants: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of participant lobster IDs',
          },
        },
        required: ['topic', 'participants'],
      },
      handler: async (args) => {
        try {
          const meeting = await client.createMeeting(
            args.topic as string,
            args.participants as string[],
          );
          return { content: `Meeting started: ${JSON.stringify(meeting, null, 2)}` };
        } catch (err) {
          return { content: `Error starting meeting: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.meeting.end',
      description: 'End an active meeting.',
      inputSchema: {
        type: 'object',
        properties: {
          meetingId: { type: 'string', description: 'Meeting ID to end' },
        },
        required: ['meetingId'],
      },
      handler: async (args) => {
        try {
          const meeting = await client.endMeeting(args.meetingId as string);
          return { content: `Meeting ended: ${JSON.stringify(meeting, null, 2)}` };
        } catch (err) {
          return { content: `Error ending meeting: ${(err as Error).message}`, isError: true };
        }
      },
    },
  ];
}
