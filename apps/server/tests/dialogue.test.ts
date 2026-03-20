import { describe, it, expect, beforeEach } from 'vitest';
import { DialogueRouter } from '../src/engine/dialogue.js';

describe('DialogueRouter', () => {
  let router: DialogueRouter;

  beforeEach(() => {
    router = new DialogueRouter();
  });

  describe('createSession', () => {
    it('creates a session with correct defaults', () => {
      const session = router.createSession('lobster-a', 'lobster-b', 'say hello', 'social');

      expect(session.id).toBeDefined();
      expect(session.participants).toEqual(['lobster-a', 'lobster-b']);
      expect(session.type).toBe('social');
      expect(session.intent).toBe('say hello');
      expect(session.turnBudget).toBe(20);
      expect(session.tokenBudget).toBe(10000);
      expect(session.turnsUsed).toBe(0);
      expect(session.tokensUsed).toBe(0);
      expect(session.status).toBe('active');
      expect(session.startedAt).toBeGreaterThan(0);
      expect(session.lastActivityAt).toBe(session.startedAt);
    });

    it('stores the session in the map', () => {
      const session = router.createSession('a', 'b', 'test', 'collab');
      expect(router.getSession(session.id)).toBe(session);
    });
  });

  describe('addMessage', () => {
    it('increments turns and tokens', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      const msg = router.addMessage(session.id, 'a', 'hello world');

      expect(msg).toBeDefined();
      expect(msg!.turnNumber).toBe(1);
      expect(session.turnsUsed).toBe(1);
      expect(session.tokensUsed).toBeGreaterThan(0);
    });

    it('estimates tokens correctly (word count * 1.3 rounded up)', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      // "hello world" = 2 words, 2 * 1.3 = 2.6, ceil = 3
      router.addMessage(session.id, 'a', 'hello world');
      expect(session.tokensUsed).toBe(3);
    });

    it('estimates tokens for longer content', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      // "one two three four five" = 5 words, 5 * 1.3 = 6.5, ceil = 7
      router.addMessage(session.id, 'a', 'one two three four five');
      expect(session.tokensUsed).toBe(7);
    });

    it('handles empty content', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      // "" = 0 words, 0 * 1.3 = 0, ceil = 0
      router.addMessage(session.id, 'a', '');
      expect(session.tokensUsed).toBe(0);
    });

    it('accumulates tokens across messages', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.addMessage(session.id, 'a', 'hello world'); // 3 tokens
      router.addMessage(session.id, 'b', 'hi there friend'); // 3 words * 1.3 = 3.9, ceil = 4
      expect(session.turnsUsed).toBe(2);
      expect(session.tokensUsed).toBe(7);
    });

    it('returns undefined for non-existent session', () => {
      const result = router.addMessage('nonexistent', 'a', 'hello');
      expect(result).toBeUndefined();
    });

    it('returns undefined for ended session', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.endSession(session.id, 'completed');
      const result = router.addMessage(session.id, 'a', 'hello');
      expect(result).toBeUndefined();
    });

    it('stores messages retrievable via getMessages', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.addMessage(session.id, 'a', 'first');
      router.addMessage(session.id, 'b', 'second');

      const messages = router.getMessages(session.id);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('first');
      expect(messages[1].content).toBe('second');
    });
  });

  describe('endSession', () => {
    it('returns correct stats', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.addMessage(session.id, 'a', 'hello world');
      router.addMessage(session.id, 'b', 'hi there');

      const stats = router.endSession(session.id, 'completed');

      expect(stats).toBeDefined();
      expect(stats!.totalTurns).toBe(2);
      expect(stats!.totalTokens).toBe(session.tokensUsed);
      expect(stats!.endReason).toBe('completed');
      expect(stats!.duration).toBeGreaterThanOrEqual(0);
    });

    it('sets status to ended for normal reasons', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.endSession(session.id, 'completed');
      expect(session.status).toBe('ended');
    });

    it('sets status to killed for circuit_breaker', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.endSession(session.id, 'circuit_breaker');
      expect(session.status).toBe('killed');
    });

    it('returns undefined for non-existent session', () => {
      const result = router.endSession('nonexistent', 'completed');
      expect(result).toBeUndefined();
    });
  });

  describe('getActiveSessions', () => {
    it('filters by active status', () => {
      const s1 = router.createSession('a', 'b', 'test1', 'social');
      const s2 = router.createSession('c', 'd', 'test2', 'collab');
      router.endSession(s1.id, 'completed');

      const active = router.getActiveSessions();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(s2.id);
    });
  });

  describe('getSessionsForLobster', () => {
    it('returns only active sessions for the lobster', () => {
      const s1 = router.createSession('a', 'b', 'test1', 'social');
      const s2 = router.createSession('a', 'c', 'test2', 'collab');
      const s3 = router.createSession('d', 'e', 'test3', 'trade');
      router.endSession(s1.id, 'completed');

      const sessions = router.getSessionsForLobster('a');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(s2.id);

      // s3 should not appear for 'a'
      expect(sessions.find((s) => s.id === s3.id)).toBeUndefined();
    });
  });

  describe('getActiveSessionCount', () => {
    it('returns count of active sessions', () => {
      router.createSession('a', 'b', 'test1', 'social');
      router.createSession('c', 'd', 'test2', 'collab');
      expect(router.getActiveSessionCount()).toBe(2);

      const s3 = router.createSession('e', 'f', 'test3', 'trade');
      router.endSession(s3.id, 'timeout');
      expect(router.getActiveSessionCount()).toBe(2);
    });
  });

  describe('cleanupDisconnected', () => {
    it('ends all active sessions for a lobster', () => {
      const s1 = router.createSession('a', 'b', 'test1', 'social');
      const s2 = router.createSession('a', 'c', 'test2', 'collab');
      const s3 = router.createSession('d', 'e', 'test3', 'trade');

      const ended = router.cleanupDisconnected('a');

      expect(ended).toHaveLength(2);
      expect(ended).toContain(s1.id);
      expect(ended).toContain(s2.id);
      expect(router.getSession(s1.id)!.status).toBe('ended');
      expect(router.getSession(s2.id)!.status).toBe('ended');
      expect(router.getSession(s3.id)!.status).toBe('active');
    });

    it('returns empty array if lobster has no sessions', () => {
      router.createSession('a', 'b', 'test', 'social');
      const ended = router.cleanupDisconnected('z');
      expect(ended).toHaveLength(0);
    });
  });

  describe('getMessages', () => {
    it('returns empty array for unknown session', () => {
      expect(router.getMessages('nonexistent')).toEqual([]);
    });
  });
});
