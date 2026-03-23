import type { PlatformClient } from '../client.js';
import { RESOURCE_URI_PREFIX } from '../constants.js';
import type { ResourceDefinition } from './scene.js';

export function createA2AResources(client: PlatformClient): ResourceDefinition[] {
  return [
    {
      uri: `${RESOURCE_URI_PREFIX}/a2a/pending`,
      name: 'A2A Pending Messages',
      description: 'Pending agent-to-agent messages for the current agent',
      mimeType: 'application/json',
      handler: async () => {
        const pending = await client.a2aGetPending(client.getConfig().displayName);
        return {
          contents: [{
            uri: `${RESOURCE_URI_PREFIX}/a2a/pending`,
            mimeType: 'application/json',
            text: JSON.stringify(pending, null, 2),
          }],
        };
      },
    },
    {
      uri: `${RESOURCE_URI_PREFIX}/a2a/active`,
      name: 'A2A Activity Stats',
      description: 'Current A2A protocol statistics — message counts, pending queues, active correlations',
      mimeType: 'application/json',
      handler: async () => {
        const stats = await client.a2aGetStats();
        return {
          contents: [{
            uri: `${RESOURCE_URI_PREFIX}/a2a/active`,
            mimeType: 'application/json',
            text: JSON.stringify(stats, null, 2),
          }],
        };
      },
    },
  ];
}
