import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAgentTools } from '../src/tools.js';
import { EventEmitter } from 'node:events';

// Minimal mock SocialProxyClient
function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
  const client = new EventEmitter() as EventEmitter & Record<string, unknown>;
  client.getState = vi.fn().mockReturnValue('joined');
  client.getLobsterId = vi.fn().mockReturnValue('lobster-abc');
  client.getSessionToken = vi.fn().mockReturnValue('tok-123');
  client.getScene = vi.fn().mockReturnValue({
    id: 's1',
    name: 'Office',
    type: 'office',
    capacity: 50,
    lobsters: {
      'lobster-abc': {
        id: 'lobster-abc',
        profile: { id: 'lobster-abc', name: 'TestBot', avatar: '', color: '#EF4444', skills: [], bio: '' },
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        animation: 'idle',
        status: 'online',
        mood: 'neutral',
      },
      'lobster-xyz': {
        id: 'lobster-xyz',
        profile: { id: 'lobster-xyz', name: 'Alice', avatar: '', color: '#3B82F6', skills: ['coding'], bio: 'Dev' },
        position: { x: 2, y: 0, z: 1 },
        rotation: 0,
        animation: 'working',
        status: 'busy',
        mood: 'focused',
      },
    },
    objects: [],
  });
  client.sendDialogueMessage = vi.fn();
  client.acceptDialogue = vi.fn();
  client.rejectDialogue = vi.fn();
  client.sendStateUpdate = vi.fn();

  Object.assign(client, overrides);
  return client;
}

describe('Agent Tools', () => {
  describe('createAgentTools', () => {
    it('returns an array of tool definitions', () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('each tool has name, description, and execute function', () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      for (const tool of tools) {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('includes expected tool names', () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      const names = tools.map((t) => t.name);
      expect(names).toContain('view-world');
      expect(names).toContain('send-message');
      expect(names).toContain('check-budget');
      expect(names).toContain('list-lobsters');
      expect(names).toContain('start-dialogue');
      expect(names).toContain('end-dialogue');
    });
  });

  describe('view-world tool', () => {
    it('returns scene snapshot when connected', async () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      const viewWorld = tools.find((t) => t.name === 'view-world')!;

      const result = await viewWorld.execute({});
      expect(result.success).toBe(true);
      expect(result.data.sceneName).toBe('Office');
      expect(result.data.lobsterCount).toBe(2);
    });

    it('returns error when not connected', async () => {
      const client = createMockClient({ getState: vi.fn().mockReturnValue('disconnected') });
      const tools = createAgentTools(client as never);
      const viewWorld = tools.find((t) => t.name === 'view-world')!;

      const result = await viewWorld.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not connected');
    });
  });

  describe('list-lobsters tool', () => {
    it('returns all lobsters with profiles', async () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      const listLobsters = tools.find((t) => t.name === 'list-lobsters')!;

      const result = await listLobsters.execute({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBeDefined();
      expect(result.data[1].name).toBeDefined();
    });
  });

  describe('send-message tool', () => {
    it('sends dialogue message through client', async () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      const sendMessage = tools.find((t) => t.name === 'send-message')!;

      const result = await sendMessage.execute({ sessionId: 'sess-1', content: 'Hello!' });
      expect(result.success).toBe(true);
      expect(client.sendDialogueMessage).toHaveBeenCalledWith('sess-1', 'Hello!');
    });

    it('returns error with missing sessionId', async () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      const sendMessage = tools.find((t) => t.name === 'send-message')!;

      const result = await sendMessage.execute({ content: 'Hello!' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('sessionId');
    });

    it('returns error with missing content', async () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      const sendMessage = tools.find((t) => t.name === 'send-message')!;

      const result = await sendMessage.execute({ sessionId: 'sess-1' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('content');
    });
  });

  describe('check-budget tool', () => {
    it('returns budget information', async () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      const checkBudget = tools.find((t) => t.name === 'check-budget')!;

      const result = await checkBudget.execute({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('state');
    });
  });

  describe('start-dialogue tool', () => {
    it('returns error without targetId', async () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      const startDialogue = tools.find((t) => t.name === 'start-dialogue')!;

      const result = await startDialogue.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('targetId');
    });
  });

  describe('end-dialogue tool', () => {
    it('returns error without sessionId', async () => {
      const client = createMockClient();
      const tools = createAgentTools(client as never);
      const endDialogue = tools.find((t) => t.name === 'end-dialogue')!;

      const result = await endDialogue.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('sessionId');
    });
  });
});
