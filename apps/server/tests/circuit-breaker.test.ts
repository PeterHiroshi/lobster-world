import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker } from '../src/engine/circuit-breaker.js';
import type { DialogueSession } from '@lobster-world/protocol';
import { DEFAULT_CIRCUIT_BREAKER } from '@lobster-world/protocol';

function makeSession(overrides: Partial<DialogueSession> = {}): DialogueSession {
  return {
    id: 'session-1',
    participants: ['lobster-a', 'lobster-b'],
    type: 'social',
    intent: 'chat',
    turnBudget: 20,
    turnsUsed: 0,
    tokenBudget: 10000,
    tokensUsed: 0,
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    status: 'active',
    ...overrides,
  };
}

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker();
  });

  // --- checkSession ---

  describe('checkSession', () => {
    it('allows session within limits', () => {
      const session = makeSession({ turnsUsed: 5, tokensUsed: 500 });
      const result = cb.checkSession(session);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('rejects session exceeding turn budget', () => {
      const session = makeSession({ turnsUsed: 20, turnBudget: 20 });
      const result = cb.checkSession(session);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Turn budget');
    });

    it('rejects session exceeding token budget', () => {
      const session = makeSession({ tokensUsed: 10000, tokenBudget: 10000 });
      const result = cb.checkSession(session);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Token budget');
    });

    it('rejects session exceeding duration', () => {
      const session = makeSession({
        startedAt: Date.now() - DEFAULT_CIRCUIT_BREAKER.maxSessionDurationMs - 1,
      });
      const result = cb.checkSession(session);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('duration');
    });
  });

  // --- canStartSession ---

  describe('canStartSession', () => {
    it('allows when within limits', () => {
      const result = cb.canStartSession('lobster-a');
      expect(result.allowed).toBe(true);
    });

    it('rejects when concurrent session limit reached', () => {
      cb.trackSessionStart('lobster-a', 's1');
      cb.trackSessionStart('lobster-a', 's2');
      cb.trackSessionStart('lobster-a', 's3');
      const result = cb.canStartSession('lobster-a');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Concurrent');
    });

    it('rejects during cooldown', () => {
      cb.trackSessionStart('lobster-a', 's1');
      cb.trackSessionEnd('lobster-a', 's1', true);
      const result = cb.canStartSession('lobster-a');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cooldown');
    });
  });

  // --- trackSessionStart / trackSessionEnd ---

  describe('trackSessionStart / trackSessionEnd', () => {
    it('tracks session start and end', () => {
      cb.trackSessionStart('lobster-a', 's1');
      expect(cb.activeSessions.get('lobster-a')?.has('s1')).toBe(true);

      cb.trackSessionEnd('lobster-a', 's1', false);
      expect(cb.activeSessions.get('lobster-a')?.has('s1')).toBe(false);
    });

    it('sets cooldown when session was killed', () => {
      cb.trackSessionStart('lobster-a', 's1');
      cb.trackSessionEnd('lobster-a', 's1', true);
      const cooldown = cb.killCooldowns.get('lobster-a');
      expect(cooldown).toBeDefined();
      expect(cooldown!).toBeGreaterThan(Date.now());
    });

    it('does not set cooldown on normal end', () => {
      cb.trackSessionStart('lobster-a', 's1');
      cb.trackSessionEnd('lobster-a', 's1', false);
      expect(cb.killCooldowns.has('lobster-a')).toBe(false);
    });
  });

  // --- checkMessage ---

  describe('checkMessage', () => {
    it('allows unique messages', () => {
      expect(cb.checkMessage('lobster-a', 'hello world').allowed).toBe(true);
      expect(cb.checkMessage('lobster-a', 'how are you').allowed).toBe(true);
      expect(cb.checkMessage('lobster-a', 'nice weather').allowed).toBe(true);
    });

    it('detects repeated identical messages and triggers kill', () => {
      // CONSECUTIVE_REPEATS_TO_KILL = 3, so 2 previous + 1 new = kill
      expect(cb.checkMessage('lobster-a', 'hello hello').allowed).toBe(true);
      expect(cb.checkMessage('lobster-a', 'hello hello').allowed).toBe(true);
      const result = cb.checkMessage('lobster-a', 'hello hello');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Repetitive');
    });

    it('allows messages from different lobsters independently', () => {
      expect(cb.checkMessage('lobster-a', 'hello hello').allowed).toBe(true);
      expect(cb.checkMessage('lobster-a', 'hello hello').allowed).toBe(true);
      // Different lobster - should be fine
      expect(cb.checkMessage('lobster-b', 'hello hello').allowed).toBe(true);
    });
  });

  // --- computeSimilarity ---

  describe('computeSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(cb.computeSimilarity('hello world', 'hello world')).toBeCloseTo(
        1.0,
      );
    });

    it('returns low value for completely different strings', () => {
      const sim = cb.computeSimilarity(
        'the quick brown fox',
        'lorem ipsum dolor sit',
      );
      expect(sim).toBeLessThan(0.1);
    });

    it('returns 0 for empty string', () => {
      expect(cb.computeSimilarity('', 'hello')).toBe(0);
      expect(cb.computeSimilarity('hello', '')).toBe(0);
      expect(cb.computeSimilarity('', '')).toBe(0);
    });
  });

  // --- Cooldown expiry with fake timers ---

  describe('cooldown expiry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('allows session after cooldown expires', () => {
      cb.trackSessionStart('lobster-a', 's1');
      cb.trackSessionEnd('lobster-a', 's1', true);

      // Still in cooldown
      expect(cb.canStartSession('lobster-a').allowed).toBe(false);

      // Advance past cooldown
      vi.advanceTimersByTime(DEFAULT_CIRCUIT_BREAKER.cooldownAfterKillMs + 1);

      expect(cb.canStartSession('lobster-a').allowed).toBe(true);
    });
  });
});
