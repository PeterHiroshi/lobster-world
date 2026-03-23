import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlatformClient } from '../src/client.js';
import {
  DEFAULT_SERVER_URL,
  DEFAULT_WS_URL,
  DEFAULT_DISPLAY_NAME,
  DEFAULT_COLOR,
} from '../src/constants.js';

// Mock fetch globally for REST tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('PlatformClient', () => {
  let client: PlatformClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new PlatformClient({
      serverUrl: DEFAULT_SERVER_URL,
      wsUrl: DEFAULT_WS_URL,
      displayName: DEFAULT_DISPLAY_NAME,
      color: DEFAULT_COLOR,
      skills: ['coding'],
    });
  });

  describe('constructor', () => {
    it('creates client with config', () => {
      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(false);
    });
  });

  // --- REST methods ---

  describe('REST: getWorldStatus', () => {
    it('fetches /api/world', async () => {
      const mockData = { lobsters: {}, stats: {} };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await client.getWorldStatus();
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/world`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.getWorldStatus()).rejects.toThrow();
    });
  });

  describe('REST: getLobsters', () => {
    it('fetches /api/lobsters', async () => {
      const mockData = [{ id: 'l1' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await client.getLobsters();
      expect(result).toEqual(mockData);
    });
  });

  describe('REST: getTasks', () => {
    it('fetches /api/tasks with no filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.getTasks();
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/tasks`,
        expect.anything(),
      );
    });

    it('fetches /api/tasks with status filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.getTasks({ status: 'todo' });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/tasks?status=todo`,
        expect.anything(),
      );
    });

    it('fetches /api/tasks with assignee filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.getTasks({ assignee: 'agent-1' });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/tasks?assignee=agent-1`,
        expect.anything(),
      );
    });
  });

  describe('REST: createTask', () => {
    it('posts to /api/tasks', async () => {
      const taskData = {
        projectId: 'p1',
        title: 'Test',
        description: 'desc',
        priority: 'medium' as const,
        createdBy: 'agent-1',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'task-1', ...taskData }),
      });

      const result = await client.createTask(taskData);
      expect(result.id).toBe('task-1');
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/tasks`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('REST: updateTask', () => {
    it('puts to /api/tasks/:id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'task-1', title: 'Updated' }),
      });

      await client.updateTask('task-1', { title: 'Updated' });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/tasks/task-1`,
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  describe('REST: transitionTask', () => {
    it('posts to /api/tasks/:id/transition', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'task-1', status: 'doing' }),
      });

      await client.transitionTask('task-1', 'doing');
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/tasks/task-1/transition`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('REST: assignTask', () => {
    it('posts to /api/tasks/:id/assign', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'task-1', assigneeId: 'agent-2' }),
      });

      await client.assignTask('task-1', 'agent-2');
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/tasks/task-1/assign`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('REST: getMeetings', () => {
    it('fetches /api/meetings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.getMeetings();
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/meetings`,
        expect.anything(),
      );
    });
  });

  describe('REST: createMeeting', () => {
    it('posts to /api/meetings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'm-1', topic: 'Standup' }),
      });

      await client.createMeeting('Standup', ['agent-1', 'agent-2']);
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/meetings`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('REST: endMeeting', () => {
    it('deletes /api/meetings/:id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'm-1', status: 'ended' }),
      });

      await client.endMeeting('m-1');
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/meetings/m-1`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('REST: sendMessage', () => {
    it('posts to /api/messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-1' }),
      });

      await client.sendMessage({ from: 'a', to: 'b', type: 'direct', content: 'hello' });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/messages`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('REST: getDocs', () => {
    it('fetches /api/docs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.getDocs();
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/docs`,
        expect.anything(),
      );
    });

    it('fetches /api/docs with category filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.getDocs({ category: 'architecture' });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/docs?category=architecture`,
        expect.anything(),
      );
    });
  });

  describe('REST: getDoc', () => {
    it('fetches /api/docs/:id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'doc-1' }),
      });

      await client.getDoc('doc-1');
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/docs/doc-1`,
        expect.anything(),
      );
    });
  });

  describe('REST: createDoc', () => {
    it('posts to /api/docs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'doc-1' }),
      });

      await client.createDoc({
        category: 'general',
        title: 'Test',
        content: 'content',
        author: 'a',
        tags: [],
      });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/docs`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('REST: updateDoc', () => {
    it('puts to /api/docs/:id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'doc-1', title: 'Updated' }),
      });

      await client.updateDoc('doc-1', { title: 'Updated' });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/docs/doc-1`,
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  describe('REST: submitCode', () => {
    it('posts to /api/code/submit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'code-1' }),
      });

      await client.submitCode({
        title: 'Login',
        code: 'fn login() {}',
        language: 'typescript',
        author: 'a',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/code/submit`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('REST: reviewCode', () => {
    it('posts to /api/code/:id/review', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'code-1', status: 'approved' }),
      });

      await client.reviewCode('code-1', {
        reviewerId: 'r',
        status: 'approved',
        comment: 'LGTM',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/code/code-1/review`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('REST: getScene', () => {
    it('fetches /api/scene', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'scene-1' }),
      });

      await client.getScene();
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_SERVER_URL}/api/scene`,
        expect.anything(),
      );
    });
  });
});
