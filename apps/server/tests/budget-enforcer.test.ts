import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetEnforcer } from '../src/engine/budget-enforcer.js';
import type { BudgetConfig } from '@lobster-world/protocol';

const config: BudgetConfig = {
  daily: { maxTokens: 1000, maxSessions: 5 },
  perSession: { maxTokens: 200, maxTurns: 10 },
};

describe('BudgetEnforcer', () => {
  let enforcer: BudgetEnforcer;

  beforeEach(() => {
    enforcer = new BudgetEnforcer();
  });

  it('registers budget config for a lobster', () => {
    enforcer.registerLobster('l-1', config);
    expect(enforcer.hasLobster('l-1')).toBe(true);
  });

  it('tracks session start', () => {
    enforcer.registerLobster('l-1', config);
    enforcer.startSession('l-1', 'sess-1');
    expect(enforcer.getSessionCount('l-1')).toBe(1);
  });

  it('tracks token usage', () => {
    enforcer.registerLobster('l-1', config);
    enforcer.startSession('l-1', 'sess-1');
    enforcer.addTokens('l-1', 'sess-1', 100);
    expect(enforcer.getSessionTokens('l-1', 'sess-1')).toBe(100);
  });

  it('tracks turn usage', () => {
    enforcer.registerLobster('l-1', config);
    enforcer.startSession('l-1', 'sess-1');
    enforcer.addTurn('l-1', 'sess-1');
    enforcer.addTurn('l-1', 'sess-1');
    expect(enforcer.getSessionTurns('l-1', 'sess-1')).toBe(2);
  });

  it('detects session token budget exceeded', () => {
    enforcer.registerLobster('l-1', config);
    enforcer.startSession('l-1', 'sess-1');
    enforcer.addTokens('l-1', 'sess-1', 201);
    expect(enforcer.isSessionBudgetExceeded('l-1', 'sess-1')).toBe(true);
  });

  it('detects session turn budget exceeded', () => {
    enforcer.registerLobster('l-1', config);
    enforcer.startSession('l-1', 'sess-1');
    for (let i = 0; i < 11; i++) {
      enforcer.addTurn('l-1', 'sess-1');
    }
    expect(enforcer.isSessionBudgetExceeded('l-1', 'sess-1')).toBe(true);
  });

  it('detects daily token budget exceeded', () => {
    enforcer.registerLobster('l-1', config);
    enforcer.startSession('l-1', 'sess-1');
    enforcer.addTokens('l-1', 'sess-1', 1001);
    expect(enforcer.isDailyBudgetExceeded('l-1')).toBe(true);
  });

  it('detects daily session limit exceeded', () => {
    enforcer.registerLobster('l-1', config);
    for (let i = 0; i < 6; i++) {
      enforcer.startSession('l-1', `sess-${i}`);
    }
    expect(enforcer.isDailyBudgetExceeded('l-1')).toBe(true);
  });

  it('emits budget_warning at 80% threshold', () => {
    const handler = vi.fn();
    enforcer.onBudgetWarning(handler);
    enforcer.registerLobster('l-1', config);
    enforcer.startSession('l-1', 'sess-1');
    enforcer.addTokens('l-1', 'sess-1', 160); // 160/200 = 80%

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ lobsterId: 'l-1', level: 'warning' }),
    );
  });

  it('emits budget_warning at 95% threshold', () => {
    const handler = vi.fn();
    enforcer.onBudgetWarning(handler);
    enforcer.registerLobster('l-1', config);
    enforcer.startSession('l-1', 'sess-1');
    enforcer.addTokens('l-1', 'sess-1', 191); // 191/200 = 95.5%

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ lobsterId: 'l-1', level: 'critical' }),
    );
  });

  it('ends session and preserves daily totals', () => {
    enforcer.registerLobster('l-1', config);
    enforcer.startSession('l-1', 'sess-1');
    enforcer.addTokens('l-1', 'sess-1', 100);
    enforcer.endSession('l-1', 'sess-1');
    expect(enforcer.getSessionTokens('l-1', 'sess-1')).toBe(0);
    expect(enforcer.getDailyTokens('l-1')).toBe(100);
  });

  it('removes lobster', () => {
    enforcer.registerLobster('l-1', config);
    enforcer.removeLobster('l-1');
    expect(enforcer.hasLobster('l-1')).toBe(false);
  });
});
