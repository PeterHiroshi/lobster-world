import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorldTools } from '../../src/tools/world.js';
import { PlatformClient } from '../../src/client.js';

vi.mock('../../src/client.js');

describe('World Tools', () => {
  let client: PlatformClient;
  let tools: ReturnType<typeof createWorldTools>;

  beforeEach(() => {
    client = new PlatformClient({
      serverUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001/ws/social',
      displayName: 'Test',
      color: '#FF0000',
      skills: [],
    });
    vi.spyOn(client, 'getConfig').mockReturnValue({
      serverUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001/ws/social',
      displayName: 'Test',
      color: '#FF0000',
      skills: [],
    });
    tools = createWorldTools(client);
  });

  it('exports 4 tools', () => {
    expect(tools).toHaveLength(4);
    const names = tools.map((t) => t.name);
    expect(names).toContain('lobster.world.status');
    expect(names).toContain('lobster.world.join');
    expect(names).toContain('lobster.world.leave');
    expect(names).toContain('lobster.status.update');
  });

  describe('lobster.world.status', () => {
    it('calls getWorldStatus and returns result', async () => {
      const mockData = { lobsters: {}, scene: {} };
      vi.spyOn(client, 'getWorldStatus').mockResolvedValue(mockData);

      const tool = tools.find((t) => t.name === 'lobster.world.status')!;
      const result = await tool.handler({});
      expect(result.content).toContain('lobsters');
      expect(client.getWorldStatus).toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      vi.spyOn(client, 'getWorldStatus').mockRejectedValue(new Error('Network error'));

      const tool = tools.find((t) => t.name === 'lobster.world.status')!;
      const result = await tool.handler({});
      expect(result.isError).toBe(true);
    });
  });

  describe('lobster.world.join', () => {
    it('returns connection info', async () => {
      const tool = tools.find((t) => t.name === 'lobster.world.join')!;
      const result = await tool.handler({});
      expect(result.content).toBeDefined();
    });
  });

  describe('lobster.world.leave', () => {
    it('returns disconnection message', async () => {
      const tool = tools.find((t) => t.name === 'lobster.world.leave')!;
      const result = await tool.handler({});
      expect(result.content).toBeDefined();
    });
  });

  describe('lobster.status.update', () => {
    it('returns status update confirmation', async () => {
      const tool = tools.find((t) => t.name === 'lobster.status.update')!;
      const result = await tool.handler({ status: 'busy' });
      expect(result.content).toBeDefined();
    });
  });
});
