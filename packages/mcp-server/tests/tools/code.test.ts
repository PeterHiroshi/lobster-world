import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCodeTools } from '../../src/tools/code.js';
import { PlatformClient } from '../../src/client.js';

vi.mock('../../src/client.js');

describe('Code Tools', () => {
  let client: PlatformClient;
  let tools: ReturnType<typeof createCodeTools>;

  beforeEach(() => {
    client = new PlatformClient({
      serverUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001/ws/social',
      displayName: 'Test',
      color: '#FF0000',
      skills: [],
    });
    tools = createCodeTools(client);
  });

  it('exports 2 tools', () => {
    expect(tools).toHaveLength(2);
    const names = tools.map((t) => t.name);
    expect(names).toContain('lobster.code.submit');
    expect(names).toContain('lobster.code.review');
  });

  describe('lobster.code.submit', () => {
    it('submits code for review', async () => {
      vi.spyOn(client, 'submitCode').mockResolvedValue({ id: 'code-1', status: 'pending' } as never);
      vi.spyOn(client, 'getConfig').mockReturnValue({
        serverUrl: '', wsUrl: '', displayName: 'Test', color: '', skills: [],
      });

      const tool = tools.find((t) => t.name === 'lobster.code.submit')!;
      const result = await tool.handler({
        title: 'Login',
        code: 'function login() {}',
        language: 'typescript',
      });
      expect(client.submitCode).toHaveBeenCalled();
      expect(result.content).toContain('code-1');
    });

    it('returns error on failure', async () => {
      vi.spyOn(client, 'submitCode').mockRejectedValue(new Error('fail'));
      vi.spyOn(client, 'getConfig').mockReturnValue({
        serverUrl: '', wsUrl: '', displayName: 'Test', color: '', skills: [],
      });

      const tool = tools.find((t) => t.name === 'lobster.code.submit')!;
      const result = await tool.handler({
        title: 'T', code: 'c', language: 'ts',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('lobster.code.review', () => {
    it('reviews a code submission', async () => {
      vi.spyOn(client, 'reviewCode').mockResolvedValue({ id: 'code-1', status: 'approved' } as never);
      vi.spyOn(client, 'getConfig').mockReturnValue({
        serverUrl: '', wsUrl: '', displayName: 'Test', color: '', skills: [],
      });

      const tool = tools.find((t) => t.name === 'lobster.code.review')!;
      const result = await tool.handler({
        submissionId: 'code-1',
        status: 'approved',
        comment: 'LGTM',
      });
      expect(client.reviewCode).toHaveBeenCalledWith('code-1', expect.anything());
      expect(result.content).toBeDefined();
    });
  });
});
