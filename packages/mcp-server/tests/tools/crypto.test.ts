import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCryptoTools } from '../../src/tools/crypto.js';
import { PlatformClient } from '../../src/client.js';

vi.mock('../../src/client.js');

const CLIENT_CONFIG = {
  serverUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001/ws/social',
  displayName: 'TestAgent',
  color: '#FF0000',
  skills: [],
};

describe('Crypto Tools', () => {
  let client: PlatformClient;
  let tools: ReturnType<typeof createCryptoTools>;

  beforeEach(() => {
    client = new PlatformClient(CLIENT_CONFIG);
    vi.spyOn(client, 'getConfig').mockReturnValue(CLIENT_CONFIG);
    tools = createCryptoTools(client);
  });

  it('exports 2 tools', () => {
    expect(tools).toHaveLength(2);
    const names = tools.map((t) => t.name);
    expect(names).toContain('lobster.crypto.status');
    expect(names).toContain('lobster.crypto.keys');
  });

  describe('lobster.crypto.status', () => {
    it('returns all session statuses when no sessionId', async () => {
      vi.spyOn(client, 'getDialogues').mockResolvedValue([
        { id: 's1', participants: ['a', 'b'], encrypted: true, status: 'active' },
        { id: 's2', participants: ['c', 'd'], status: 'active' },
      ] as never);

      const tool = tools.find((t) => t.name === 'lobster.crypto.status')!;
      const result = await tool.handler({});
      const parsed = JSON.parse(result.content);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].encrypted).toBe(true);
      expect(parsed[1].encrypted).toBe(false);
    });

    it('returns specific session status', async () => {
      vi.spyOn(client, 'getDialogues').mockResolvedValue([
        { id: 's1', participants: ['a', 'b'], encrypted: true, status: 'active' },
      ] as never);

      const tool = tools.find((t) => t.name === 'lobster.crypto.status')!;
      const result = await tool.handler({ sessionId: 's1' });
      const parsed = JSON.parse(result.content);

      expect(parsed.sessionId).toBe('s1');
      expect(parsed.encrypted).toBe(true);
    });

    it('handles session not found', async () => {
      vi.spyOn(client, 'getDialogues').mockResolvedValue([]);

      const tool = tools.find((t) => t.name === 'lobster.crypto.status')!;
      const result = await tool.handler({ sessionId: 'nonexistent' });
      expect(result.content).toContain('not found');
    });

    it('handles errors gracefully', async () => {
      vi.spyOn(client, 'getDialogues').mockRejectedValue(new Error('Network error'));

      const tool = tools.find((t) => t.name === 'lobster.crypto.status')!;
      const result = await tool.handler({});
      expect(result.isError).toBe(true);
      expect(result.content).toContain('Network error');
    });
  });

  describe('lobster.crypto.keys', () => {
    it('fetches own key when no lobsterId specified', async () => {
      const mockRecord = { lobsterId: 'TestAgent', x25519PublicKey: 'key-abc', updatedAt: 1000 };
      vi.spyOn(client, 'getPublicKey').mockResolvedValue(mockRecord);

      const tool = tools.find((t) => t.name === 'lobster.crypto.keys')!;
      const result = await tool.handler({});
      const parsed = JSON.parse(result.content);

      expect(client.getPublicKey).toHaveBeenCalledWith('TestAgent');
      expect(parsed.lobsterId).toBe('TestAgent');
    });

    it('fetches another agent key by lobsterId', async () => {
      const mockRecord = { lobsterId: 'agent-b', x25519PublicKey: 'key-b', updatedAt: 2000 };
      vi.spyOn(client, 'getPublicKey').mockResolvedValue(mockRecord);

      const tool = tools.find((t) => t.name === 'lobster.crypto.keys')!;
      const result = await tool.handler({ lobsterId: 'agent-b' });
      const parsed = JSON.parse(result.content);

      expect(client.getPublicKey).toHaveBeenCalledWith('agent-b');
      expect(parsed.lobsterId).toBe('agent-b');
    });

    it('handles errors gracefully', async () => {
      vi.spyOn(client, 'getPublicKey').mockRejectedValue(new Error('404'));

      const tool = tools.find((t) => t.name === 'lobster.crypto.keys')!;
      const result = await tool.handler({ lobsterId: 'unknown' });
      expect(result.isError).toBe(true);
      expect(result.content).toContain('404');
    });
  });
});
