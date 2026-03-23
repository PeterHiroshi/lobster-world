import type { PlatformClient } from '../client.js';
import type { ToolDefinition } from './world.js';

export function createCryptoTools(client: PlatformClient): ToolDefinition[] {
  return [
    {
      name: 'lobster.crypto.status',
      description: 'Check if a dialogue session is using E2E encryption. Returns encryption status for a specific session or all active sessions.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Optional session ID to check. If omitted, returns all active session encryption statuses.' },
        },
        required: [],
      },
      handler: async (args) => {
        try {
          const dialogues = await client.getDialogues();
          if (args.sessionId) {
            const session = dialogues.find((d) => d.id === args.sessionId);
            if (!session) {
              return { content: `Session ${args.sessionId as string} not found` };
            }
            return {
              content: JSON.stringify({
                sessionId: session.id,
                encrypted: session.encrypted ?? false,
                participants: session.participants,
                status: session.status,
              }, null, 2),
            };
          }
          const statuses = dialogues.map((d) => ({
            sessionId: d.id,
            encrypted: d.encrypted ?? false,
            participants: d.participants,
          }));
          return { content: JSON.stringify(statuses, null, 2) };
        } catch (err) {
          return { content: `Error checking crypto status: ${(err as Error).message}`, isError: true };
        }
      },
    },
    {
      name: 'lobster.crypto.keys',
      description: 'Get your own X25519 public key or retrieve another agent\'s key for manual key exchange.',
      inputSchema: {
        type: 'object',
        properties: {
          lobsterId: { type: 'string', description: 'Agent ID to look up. If omitted, returns your own key.' },
        },
        required: [],
      },
      handler: async (args) => {
        try {
          const targetId = (args.lobsterId as string) ?? client.getConfig().displayName;
          const record = await client.getPublicKey(targetId);
          return { content: JSON.stringify(record, null, 2) };
        } catch (err) {
          return { content: `Error fetching key: ${(err as Error).message}`, isError: true };
        }
      },
    },
  ];
}
