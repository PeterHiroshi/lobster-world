import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createA2AResources } from '../../src/resources/a2a.js';
import { PlatformClient } from '../../src/client.js';

vi.mock('../../src/client.js');

const CLIENT_CONFIG = {
  serverUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001/ws/social',
  displayName: 'TestAgent',
  color: '#FF0000',
  skills: [],
};

describe('A2A Resources', () => {
  let client: PlatformClient;
  let resources: ReturnType<typeof createA2AResources>;

  beforeEach(() => {
    client = new PlatformClient(CLIENT_CONFIG);
    vi.spyOn(client, 'getConfig').mockReturnValue(CLIENT_CONFIG);
    resources = createA2AResources(client);
  });

  it('exports 2 resources', () => {
    expect(resources).toHaveLength(2);
    expect(resources[0].uri).toContain('a2a/pending');
    expect(resources[1].uri).toContain('a2a/active');
  });

  describe('a2a/pending', () => {
    it('returns pending messages', async () => {
      const mockPending = [{ id: 'a2a-1', type: 'task_delegate' }];
      vi.spyOn(client, 'a2aGetPending').mockResolvedValue(mockPending as never);

      const resource = resources[0];
      const result = await resource.handler();

      expect(client.a2aGetPending).toHaveBeenCalledWith('TestAgent');
      expect(result.contents).toHaveLength(1);
      expect(JSON.parse(result.contents[0].text)).toEqual(mockPending);
    });
  });

  describe('a2a/active', () => {
    it('returns stats', async () => {
      const mockStats = { totalMessages: 5, pendingMessages: 2, activeCorrelations: 1, messagesByType: {} };
      vi.spyOn(client, 'a2aGetStats').mockResolvedValue(mockStats);

      const resource = resources[1];
      const result = await resource.handler();

      expect(result.contents).toHaveLength(1);
      expect(JSON.parse(result.contents[0].text)).toEqual(mockStats);
    });
  });
});
