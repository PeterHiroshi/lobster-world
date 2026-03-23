import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createResources } from '../../src/resources/scene.js';
import { PlatformClient } from '../../src/client.js';
import { RESOURCE_URI_PREFIX } from '../../src/constants.js';

vi.mock('../../src/client.js');

describe('MCP Resources', () => {
  let client: PlatformClient;
  let resources: ReturnType<typeof createResources>;

  beforeEach(() => {
    client = new PlatformClient({
      serverUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001/ws/social',
      displayName: 'Test',
      color: '#FF0000',
      skills: [],
    });
    resources = createResources(client);
  });

  it('exports 5 resources', () => {
    expect(resources).toHaveLength(5);
  });

  it('all resource URIs start with lobster://world/', () => {
    for (const r of resources) {
      expect(r.uri).toMatch(new RegExp(`^${RESOURCE_URI_PREFIX.replace('://', '://')}/`));
    }
  });

  describe('lobster://world/scene', () => {
    it('returns scene state', async () => {
      vi.spyOn(client, 'getScene').mockResolvedValue({ id: 'scene-1', objects: [] } as never);

      const resource = resources.find((r) => r.uri === `${RESOURCE_URI_PREFIX}/scene`)!;
      const result = await resource.handler();
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(result.contents[0].text).toContain('scene-1');
    });
  });

  describe('lobster://world/lobsters', () => {
    it('returns connected lobsters', async () => {
      vi.spyOn(client, 'getLobsters').mockResolvedValue([{ id: 'l1' }] as never);

      const resource = resources.find((r) => r.uri === `${RESOURCE_URI_PREFIX}/lobsters`)!;
      const result = await resource.handler();
      expect(result.contents[0].text).toContain('l1');
    });
  });

  describe('lobster://world/tasks', () => {
    it('returns active tasks', async () => {
      vi.spyOn(client, 'getTasks').mockResolvedValue([{ id: 'task-1' }] as never);

      const resource = resources.find((r) => r.uri === `${RESOURCE_URI_PREFIX}/tasks`)!;
      const result = await resource.handler();
      expect(result.contents[0].text).toContain('task-1');
    });
  });

  describe('lobster://world/meetings', () => {
    it('returns active meetings', async () => {
      vi.spyOn(client, 'getMeetings').mockResolvedValue([{ id: 'm-1' }] as never);

      const resource = resources.find((r) => r.uri === `${RESOURCE_URI_PREFIX}/meetings`)!;
      const result = await resource.handler();
      expect(result.contents[0].text).toContain('m-1');
    });
  });

  describe('lobster://world/memory', () => {
    it('returns collective memory', async () => {
      vi.spyOn(client, 'getDocs').mockResolvedValue([{ id: 'doc-1' }] as never);

      const resource = resources.find((r) => r.uri === `${RESOURCE_URI_PREFIX}/memory`)!;
      const result = await resource.handler();
      expect(result.contents[0].text).toContain('doc-1');
    });
  });
});
