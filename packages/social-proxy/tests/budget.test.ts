import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetCounter } from '../src/budget.js';
import type { BudgetConfig } from '@lobster-world/protocol';

const config: BudgetConfig = {
  daily: { maxTokens: 1000, maxSessions: 5 },
  perSession: { maxTokens: 200, maxTurns: 10 },
};

describe('BudgetCounter', () => {
  let counter: BudgetCounter;

  beforeEach(() => {
    counter = new BudgetCounter(config);
  });

  it('starts with zero usage', () => {
    const usage = counter.getUsage();
    expect(usage.daily.tokensUsed).toBe(0);
    expect(usage.daily.sessionsUsed).toBe(0);
  });

  it('tracks session start', () => {
    counter.startSession('sess-1');
    expect(counter.getUsage().daily.sessionsUsed).toBe(1);
  });

  it('tracks token usage per session', () => {
    counter.startSession('sess-1');
    counter.addTokens('sess-1', 50);
    const session = counter.getSessionUsage('sess-1');
    expect(session?.tokensUsed).toBe(50);
  });

  it('tracks turn usage per session', () => {
    counter.startSession('sess-1');
    counter.addTurn('sess-1');
    counter.addTurn('sess-1');
    const session = counter.getSessionUsage('sess-1');
    expect(session?.turnsUsed).toBe(2);
  });

  it('accumulates daily token usage', () => {
    counter.startSession('sess-1');
    counter.addTokens('sess-1', 100);
    counter.startSession('sess-2');
    counter.addTokens('sess-2', 150);
    expect(counter.getUsage().daily.tokensUsed).toBe(250);
  });

  it('emits warning at 80% threshold', () => {
    const handler = vi.fn();
    counter.onWarning(handler);

    counter.startSession('sess-1');
    counter.addTokens('sess-1', 160); // 160/200 = 80%

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warning' }),
    );
  });

  it('emits critical at 95% threshold', () => {
    const handler = vi.fn();
    counter.onWarning(handler);

    counter.startSession('sess-1');
    counter.addTokens('sess-1', 190); // 190/200 = 95%

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'critical' }),
    );
  });

  it('detects session budget exceeded', () => {
    counter.startSession('sess-1');
    counter.addTokens('sess-1', 201);
    expect(counter.isSessionBudgetExceeded('sess-1')).toBe(true);
  });

  it('detects session turn limit exceeded', () => {
    counter.startSession('sess-1');
    for (let i = 0; i < 11; i++) {
      counter.addTurn('sess-1');
    }
    expect(counter.isSessionBudgetExceeded('sess-1')).toBe(true);
  });

  it('detects daily budget exceeded', () => {
    counter.startSession('sess-1');
    counter.addTokens('sess-1', 1001);
    expect(counter.isDailyBudgetExceeded()).toBe(true);
  });

  it('detects daily session limit exceeded', () => {
    for (let i = 0; i < 6; i++) {
      counter.startSession(`sess-${i}`);
    }
    expect(counter.isDailyBudgetExceeded()).toBe(true);
  });

  it('ends session cleanly', () => {
    counter.startSession('sess-1');
    counter.addTokens('sess-1', 50);
    counter.endSession('sess-1');
    expect(counter.getSessionUsage('sess-1')).toBeNull();
    // Daily tokens remain
    expect(counter.getUsage().daily.tokensUsed).toBe(50);
  });

  it('resets daily usage', () => {
    counter.startSession('sess-1');
    counter.addTokens('sess-1', 500);
    counter.resetDaily();
    expect(counter.getUsage().daily.tokensUsed).toBe(0);
    expect(counter.getUsage().daily.sessionsUsed).toBe(0);
  });
});
