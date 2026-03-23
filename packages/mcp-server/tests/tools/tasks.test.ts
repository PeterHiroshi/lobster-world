import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTaskTools } from '../../src/tools/tasks.js';
import { PlatformClient } from '../../src/client.js';

vi.mock('../../src/client.js');

describe('Task Tools', () => {
  let client: PlatformClient;
  let tools: ReturnType<typeof createTaskTools>;

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
    tools = createTaskTools(client);
  });

  it('exports 4 tools', () => {
    expect(tools).toHaveLength(4);
    const names = tools.map((t) => t.name);
    expect(names).toContain('lobster.tasks.list');
    expect(names).toContain('lobster.tasks.create');
    expect(names).toContain('lobster.tasks.update');
    expect(names).toContain('lobster.tasks.assign');
  });

  describe('lobster.tasks.list', () => {
    it('calls getTasks with filters', async () => {
      vi.spyOn(client, 'getTasks').mockResolvedValue([]);

      const tool = tools.find((t) => t.name === 'lobster.tasks.list')!;
      const result = await tool.handler({ status: 'todo' });
      expect(client.getTasks).toHaveBeenCalledWith({ status: 'todo', assignee: undefined });
      expect(result.content).toBeDefined();
    });

    it('returns error on failure', async () => {
      vi.spyOn(client, 'getTasks').mockRejectedValue(new Error('fail'));

      const tool = tools.find((t) => t.name === 'lobster.tasks.list')!;
      const result = await tool.handler({});
      expect(result.isError).toBe(true);
    });
  });

  describe('lobster.tasks.create', () => {
    it('calls createTask', async () => {
      const mockTask = { id: 'task-1', title: 'Test', status: 'todo' };
      vi.spyOn(client, 'createTask').mockResolvedValue(mockTask as never);

      const tool = tools.find((t) => t.name === 'lobster.tasks.create')!;
      const result = await tool.handler({
        title: 'Test',
        description: 'desc',
        priority: 'medium',
        projectId: 'p1',
      });
      expect(result.content).toContain('task-1');
    });
  });

  describe('lobster.tasks.update', () => {
    it('calls updateTask for field changes', async () => {
      vi.spyOn(client, 'updateTask').mockResolvedValue({ id: 'task-1' } as never);

      const tool = tools.find((t) => t.name === 'lobster.tasks.update')!;
      const result = await tool.handler({ taskId: 'task-1', title: 'Updated' });
      expect(client.updateTask).toHaveBeenCalled();
      expect(result.content).toBeDefined();
    });

    it('calls transitionTask for status changes', async () => {
      vi.spyOn(client, 'transitionTask').mockResolvedValue({ id: 'task-1' } as never);

      const tool = tools.find((t) => t.name === 'lobster.tasks.update')!;
      const result = await tool.handler({ taskId: 'task-1', status: 'doing' });
      expect(client.transitionTask).toHaveBeenCalledWith('task-1', 'doing');
      expect(result.content).toBeDefined();
    });
  });

  describe('lobster.tasks.assign', () => {
    it('calls assignTask', async () => {
      vi.spyOn(client, 'assignTask').mockResolvedValue({ id: 'task-1' } as never);

      const tool = tools.find((t) => t.name === 'lobster.tasks.assign')!;
      const result = await tool.handler({ taskId: 'task-1', assigneeId: 'agent-2' });
      expect(client.assignTask).toHaveBeenCalledWith('task-1', 'agent-2');
      expect(result.content).toBeDefined();
    });
  });
});
