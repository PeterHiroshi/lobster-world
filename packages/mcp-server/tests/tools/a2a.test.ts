import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createA2ATools } from '../../src/tools/a2a.js';
import { PlatformClient } from '../../src/client.js';

vi.mock('../../src/client.js');

const CLIENT_CONFIG = {
  serverUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001/ws/social',
  displayName: 'TestAgent',
  color: '#FF0000',
  skills: [],
};

describe('A2A Tools', () => {
  let client: PlatformClient;
  let tools: ReturnType<typeof createA2ATools>;

  beforeEach(() => {
    client = new PlatformClient(CLIENT_CONFIG);
    vi.spyOn(client, 'getConfig').mockReturnValue(CLIENT_CONFIG);
    tools = createA2ATools(client);
  });

  it('exports 6 tools', () => {
    expect(tools).toHaveLength(6);
    const names = tools.map((t) => t.name);
    expect(names).toContain('lobster.a2a.delegate');
    expect(names).toContain('lobster.a2a.review');
    expect(names).toContain('lobster.a2a.share');
    expect(names).toContain('lobster.a2a.collab');
    expect(names).toContain('lobster.a2a.pending');
    expect(names).toContain('lobster.a2a.respond');
  });

  describe('lobster.a2a.delegate', () => {
    it('sends task_delegate message', async () => {
      const mockMsg = { id: 'a2a-1', type: 'task_delegate' };
      vi.spyOn(client, 'a2aSend').mockResolvedValue(mockMsg as never);

      const tool = tools.find((t) => t.name === 'lobster.a2a.delegate')!;
      const result = await tool.handler({
        to: 'agent-b',
        taskId: 'task-1',
        title: 'Build feature',
        priority: 'high',
      });

      expect(client.a2aSend).toHaveBeenCalledWith(expect.objectContaining({
        type: 'task_delegate',
        from: 'TestAgent',
        to: 'agent-b',
      }));
      expect(result.isError).toBeUndefined();
    });

    it('returns error on failure', async () => {
      vi.spyOn(client, 'a2aSend').mockRejectedValue(new Error('network'));
      const tool = tools.find((t) => t.name === 'lobster.a2a.delegate')!;
      const result = await tool.handler({ to: 'x', taskId: 'y', title: 'z' });
      expect(result.isError).toBe(true);
    });
  });

  describe('lobster.a2a.review', () => {
    it('sends review_request message', async () => {
      vi.spyOn(client, 'a2aSend').mockResolvedValue({ id: 'a2a-2' } as never);

      const tool = tools.find((t) => t.name === 'lobster.a2a.review')!;
      const result = await tool.handler({
        to: 'reviewer',
        submissionId: 'sub-1',
        title: 'Review PR',
        language: 'typescript',
      });

      expect(client.a2aSend).toHaveBeenCalledWith(expect.objectContaining({
        type: 'review_request',
        to: 'reviewer',
      }));
      expect(result.isError).toBeUndefined();
    });
  });

  describe('lobster.a2a.share', () => {
    it('sends knowledge_share to multiple agents', async () => {
      vi.spyOn(client, 'a2aSend').mockResolvedValue({ id: 'a2a-3' } as never);

      const tool = tools.find((t) => t.name === 'lobster.a2a.share')!;
      await tool.handler({
        to: ['agent-b', 'agent-c'],
        topic: 'Design patterns',
        content: 'Use factory pattern',
        tags: ['design'],
      });

      expect(client.a2aSend).toHaveBeenCalledWith(expect.objectContaining({
        type: 'knowledge_share',
        to: ['agent-b', 'agent-c'],
      }));
    });
  });

  describe('lobster.a2a.collab', () => {
    it('sends collab_invite message', async () => {
      vi.spyOn(client, 'a2aSend').mockResolvedValue({ id: 'a2a-4' } as never);

      const tool = tools.find((t) => t.name === 'lobster.a2a.collab')!;
      await tool.handler({
        to: 'agent-b',
        sessionId: 'collab-1',
        topic: 'API design',
      });

      expect(client.a2aSend).toHaveBeenCalledWith(expect.objectContaining({
        type: 'collab_invite',
      }));
    });
  });

  describe('lobster.a2a.pending', () => {
    it('fetches pending messages for current agent', async () => {
      vi.spyOn(client, 'a2aGetPending').mockResolvedValue([]);

      const tool = tools.find((t) => t.name === 'lobster.a2a.pending')!;
      const result = await tool.handler({});

      expect(client.a2aGetPending).toHaveBeenCalledWith('TestAgent');
      expect(result.content).toBe('[]');
    });

    it('allows overriding agentId', async () => {
      vi.spyOn(client, 'a2aGetPending').mockResolvedValue([]);

      const tool = tools.find((t) => t.name === 'lobster.a2a.pending')!;
      await tool.handler({ agentId: 'other' });

      expect(client.a2aGetPending).toHaveBeenCalledWith('other');
    });
  });

  describe('lobster.a2a.respond', () => {
    it('sends response and acknowledges original', async () => {
      vi.spyOn(client, 'a2aSend').mockResolvedValue({ id: 'a2a-5' } as never);
      vi.spyOn(client, 'a2aAck').mockResolvedValue({ acked: true });

      const tool = tools.find((t) => t.name === 'lobster.a2a.respond')!;
      const result = await tool.handler({
        messageId: 'a2a-1',
        responseType: 'task_accept',
        to: 'agent-a',
        payload: { taskId: 'task-1' },
        correlationId: 'corr-1',
      });

      expect(client.a2aSend).toHaveBeenCalledWith(expect.objectContaining({
        type: 'task_accept',
        to: 'agent-a',
        correlationId: 'corr-1',
      }));
      expect(client.a2aAck).toHaveBeenCalledWith('a2a-1', 'TestAgent');
      expect(result.isError).toBeUndefined();
    });

    it('skips ack when no messageId', async () => {
      vi.spyOn(client, 'a2aSend').mockResolvedValue({ id: 'a2a-6' } as never);
      vi.spyOn(client, 'a2aAck').mockResolvedValue({ acked: true });

      const tool = tools.find((t) => t.name === 'lobster.a2a.respond')!;
      await tool.handler({
        responseType: 'pong',
        to: 'agent-a',
        payload: {},
      });

      expect(client.a2aAck).not.toHaveBeenCalled();
    });
  });
});
