import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createChatTools } from '../../src/tools/chat.js';
import { PlatformClient } from '../../src/client.js';

vi.mock('../../src/client.js');

describe('Chat Tools', () => {
  let client: PlatformClient;
  let tools: ReturnType<typeof createChatTools>;

  beforeEach(() => {
    client = new PlatformClient({
      serverUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001/ws/social',
      displayName: 'Test',
      color: '#FF0000',
      skills: [],
    });
    tools = createChatTools(client);
  });

  it('exports 4 tools', () => {
    expect(tools).toHaveLength(4);
    const names = tools.map((t) => t.name);
    expect(names).toContain('lobster.chat.send');
    expect(names).toContain('lobster.chat.broadcast');
    expect(names).toContain('lobster.meeting.start');
    expect(names).toContain('lobster.meeting.end');
  });

  describe('lobster.chat.send', () => {
    it('sends a direct message', async () => {
      vi.spyOn(client, 'sendMessage').mockResolvedValue({ id: 'msg-1' } as never);
      vi.spyOn(client, 'getConfig').mockReturnValue({
        serverUrl: '', wsUrl: '', displayName: 'Test', color: '', skills: [],
      });

      const tool = tools.find((t) => t.name === 'lobster.chat.send')!;
      const result = await tool.handler({ to: 'agent-2', content: 'hello' });
      expect(client.sendMessage).toHaveBeenCalled();
      expect(result.content).toBeDefined();
    });

    it('returns error on failure', async () => {
      vi.spyOn(client, 'sendMessage').mockRejectedValue(new Error('fail'));
      vi.spyOn(client, 'getConfig').mockReturnValue({
        serverUrl: '', wsUrl: '', displayName: 'Test', color: '', skills: [],
      });

      const tool = tools.find((t) => t.name === 'lobster.chat.send')!;
      const result = await tool.handler({ to: 'agent-2', content: 'hello' });
      expect(result.isError).toBe(true);
    });
  });

  describe('lobster.chat.broadcast', () => {
    it('broadcasts a message', async () => {
      vi.spyOn(client, 'sendMessage').mockResolvedValue({ id: 'msg-1' } as never);
      vi.spyOn(client, 'getConfig').mockReturnValue({
        serverUrl: '', wsUrl: '', displayName: 'Test', color: '', skills: [],
      });

      const tool = tools.find((t) => t.name === 'lobster.chat.broadcast')!;
      const result = await tool.handler({ content: 'announcement' });
      expect(client.sendMessage).toHaveBeenCalled();
      expect(result.content).toBeDefined();
    });
  });

  describe('lobster.meeting.start', () => {
    it('creates a meeting', async () => {
      vi.spyOn(client, 'createMeeting').mockResolvedValue({ id: 'm-1', topic: 'Standup' } as never);

      const tool = tools.find((t) => t.name === 'lobster.meeting.start')!;
      const result = await tool.handler({ topic: 'Standup', participants: ['a', 'b'] });
      expect(client.createMeeting).toHaveBeenCalledWith('Standup', ['a', 'b']);
      expect(result.content).toBeDefined();
    });
  });

  describe('lobster.meeting.end', () => {
    it('ends a meeting', async () => {
      vi.spyOn(client, 'endMeeting').mockResolvedValue({ id: 'm-1', status: 'ended' } as never);

      const tool = tools.find((t) => t.name === 'lobster.meeting.end')!;
      const result = await tool.handler({ meetingId: 'm-1' });
      expect(client.endMeeting).toHaveBeenCalledWith('m-1');
      expect(result.content).toBeDefined();
    });
  });
});
