import type { PlatformClient } from '../client.js';
import { RESOURCE_URI_PREFIX } from '../constants.js';

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export interface ResourceResult {
  contents: ResourceContent[];
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<ResourceResult>;
}

export function createResources(client: PlatformClient): ResourceDefinition[] {
  return [
    {
      uri: `${RESOURCE_URI_PREFIX}/scene`,
      name: 'Scene State',
      description: 'Current 3D scene state including all objects and layout',
      mimeType: 'application/json',
      handler: async () => {
        const scene = await client.getScene();
        return {
          contents: [{
            uri: `${RESOURCE_URI_PREFIX}/scene`,
            mimeType: 'application/json',
            text: JSON.stringify(scene, null, 2),
          }],
        };
      },
    },
    {
      uri: `${RESOURCE_URI_PREFIX}/lobsters`,
      name: 'Connected Lobsters',
      description: 'All connected lobsters and their current status',
      mimeType: 'application/json',
      handler: async () => {
        const lobsters = await client.getLobsters();
        return {
          contents: [{
            uri: `${RESOURCE_URI_PREFIX}/lobsters`,
            mimeType: 'application/json',
            text: JSON.stringify(lobsters, null, 2),
          }],
        };
      },
    },
    {
      uri: `${RESOURCE_URI_PREFIX}/tasks`,
      name: 'Active Tasks',
      description: 'All active tasks in the project',
      mimeType: 'application/json',
      handler: async () => {
        const tasks = await client.getTasks();
        return {
          contents: [{
            uri: `${RESOURCE_URI_PREFIX}/tasks`,
            mimeType: 'application/json',
            text: JSON.stringify(tasks, null, 2),
          }],
        };
      },
    },
    {
      uri: `${RESOURCE_URI_PREFIX}/meetings`,
      name: 'Active Meetings',
      description: 'Currently active meetings',
      mimeType: 'application/json',
      handler: async () => {
        const meetings = await client.getMeetings();
        return {
          contents: [{
            uri: `${RESOURCE_URI_PREFIX}/meetings`,
            mimeType: 'application/json',
            text: JSON.stringify(meetings, null, 2),
          }],
        };
      },
    },
    {
      uri: `${RESOURCE_URI_PREFIX}/memory`,
      name: 'Collective Memory',
      description: 'Shared knowledge base — architecture decisions, patterns, agreements',
      mimeType: 'application/json',
      handler: async () => {
        const docs = await client.getDocs();
        return {
          contents: [{
            uri: `${RESOURCE_URI_PREFIX}/memory`,
            mimeType: 'application/json',
            text: JSON.stringify(docs, null, 2),
          }],
        };
      },
    },
  ];
}
