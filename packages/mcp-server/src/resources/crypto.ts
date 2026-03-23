import type { PlatformClient } from '../client.js';
import { RESOURCE_URI_PREFIX } from '../constants.js';
import type { ResourceDefinition } from './scene.js';

export function createCryptoResources(client: PlatformClient): ResourceDefinition[] {
  return [
    {
      uri: `${RESOURCE_URI_PREFIX}/crypto/status`,
      name: 'E2E Encryption Status',
      description: 'E2E encryption status for all active dialogue sessions — shows which sessions are encrypted',
      mimeType: 'application/json',
      handler: async () => {
        const dialogues = await client.getDialogues();
        const statuses = dialogues.map((d) => ({
          sessionId: d.id,
          encrypted: d.encrypted ?? false,
          participants: d.participants,
          status: d.status,
        }));
        return {
          contents: [{
            uri: `${RESOURCE_URI_PREFIX}/crypto/status`,
            mimeType: 'application/json',
            text: JSON.stringify(statuses, null, 2),
          }],
        };
      },
    },
  ];
}
