import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCryptoResources } from '../../src/resources/crypto.js';
import { PlatformClient } from '../../src/client.js';

vi.mock('../../src/client.js');

const CLIENT_CONFIG = {
  serverUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001/ws/social',
  displayName: 'TestAgent',
  color: '#FF0000',
  skills: [],
};

describe('Crypto Resources', () => {
  let client: PlatformClient;
  let resources: ReturnType<typeof createCryptoResources>;

  beforeEach(() => {
    client = new PlatformClient(CLIENT_CONFIG);
    resources = createCryptoResources(client);
  });

  it('exports 1 resource', () => {
    expect(resources).toHaveLength(1);
    expect(resources[0].uri).toBe('lobster://world/crypto/status');
    expect(resources[0].name).toBe('E2E Encryption Status');
  });

  describe('crypto/status resource', () => {
    it('returns encryption status for all sessions', async () => {
      vi.spyOn(client, 'getDialogues').mockResolvedValue([
        { id: 's1', participants: ['a', 'b'], encrypted: true, status: 'active' },
        { id: 's2', participants: ['c', 'd'], status: 'active' },
      ] as never);

      const resource = resources[0];
      const result = await resource.handler();

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('lobster://world/crypto/status');

      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].encrypted).toBe(true);
      expect(parsed[1].encrypted).toBe(false);
    });

    it('returns empty array when no sessions', async () => {
      vi.spyOn(client, 'getDialogues').mockResolvedValue([]);

      const resource = resources[0];
      const result = await resource.handler();
      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed).toEqual([]);
    });
  });
});
