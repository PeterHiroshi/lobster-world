import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDocsTools } from '../../src/tools/docs.js';
import { PlatformClient } from '../../src/client.js';

vi.mock('../../src/client.js');

describe('Docs Tools', () => {
  let client: PlatformClient;
  let tools: ReturnType<typeof createDocsTools>;

  beforeEach(() => {
    client = new PlatformClient({
      serverUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001/ws/social',
      displayName: 'Test',
      color: '#FF0000',
      skills: [],
    });
    tools = createDocsTools(client);
  });

  it('exports 2 tools', () => {
    expect(tools).toHaveLength(2);
    const names = tools.map((t) => t.name);
    expect(names).toContain('lobster.docs.read');
    expect(names).toContain('lobster.docs.write');
  });

  describe('lobster.docs.read', () => {
    it('reads a document by ID', async () => {
      vi.spyOn(client, 'getDoc').mockResolvedValue({
        id: 'doc-1', title: 'Test', content: 'content',
      } as never);

      const tool = tools.find((t) => t.name === 'lobster.docs.read')!;
      const result = await tool.handler({ docId: 'doc-1' });
      expect(client.getDoc).toHaveBeenCalledWith('doc-1');
      expect(result.content).toContain('Test');
    });

    it('lists all docs when no ID provided', async () => {
      vi.spyOn(client, 'getDocs').mockResolvedValue([]);

      const tool = tools.find((t) => t.name === 'lobster.docs.read')!;
      const result = await tool.handler({});
      expect(client.getDocs).toHaveBeenCalled();
      expect(result.content).toBeDefined();
    });

    it('returns error on failure', async () => {
      vi.spyOn(client, 'getDoc').mockRejectedValue(new Error('not found'));

      const tool = tools.find((t) => t.name === 'lobster.docs.read')!;
      const result = await tool.handler({ docId: 'doc-999' });
      expect(result.isError).toBe(true);
    });
  });

  describe('lobster.docs.write', () => {
    it('creates a new document', async () => {
      vi.spyOn(client, 'createDoc').mockResolvedValue({ id: 'doc-1' } as never);
      vi.spyOn(client, 'getConfig').mockReturnValue({
        serverUrl: '', wsUrl: '', displayName: 'Test', color: '', skills: [],
      });

      const tool = tools.find((t) => t.name === 'lobster.docs.write')!;
      const result = await tool.handler({
        title: 'New Doc',
        content: 'content',
        category: 'general',
        tags: ['test'],
      });
      expect(client.createDoc).toHaveBeenCalled();
      expect(result.content).toBeDefined();
    });

    it('updates existing document when docId provided', async () => {
      vi.spyOn(client, 'updateDoc').mockResolvedValue({ id: 'doc-1' } as never);

      const tool = tools.find((t) => t.name === 'lobster.docs.write')!;
      const result = await tool.handler({
        docId: 'doc-1',
        title: 'Updated',
        content: 'new content',
      });
      expect(client.updateDoc).toHaveBeenCalledWith('doc-1', expect.anything());
      expect(result.content).toBeDefined();
    });
  });
});
