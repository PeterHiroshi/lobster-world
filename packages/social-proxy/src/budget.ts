import type { BudgetConfig } from '@lobster-world/protocol';
import {
  BUDGET_WARNING_THRESHOLD,
  BUDGET_CRITICAL_THRESHOLD,
} from '@lobster-world/protocol';

export interface BudgetWarning {
  level: 'warning' | 'critical';
  scope: 'session' | 'daily';
  tokensUsed: number;
  tokensLimit: number;
}

interface SessionUsage {
  tokensUsed: number;
  turnsUsed: number;
  startedAt: number;
}

interface DailyUsage {
  tokensUsed: number;
  sessionsUsed: number;
  resetAt: number;
}

type WarningHandler = (warning: BudgetWarning) => void;

export class BudgetCounter {
  private config: BudgetConfig;
  private daily: DailyUsage;
  private sessions = new Map<string, SessionUsage>();
  private warningHandler: WarningHandler | null = null;
  private sessionWarned = new Map<string, 'warning' | 'critical'>();
  private dailyWarned: 'warning' | 'critical' | null = null;

  constructor(config: BudgetConfig) {
    this.config = config;
    this.daily = { tokensUsed: 0, sessionsUsed: 0, resetAt: Date.now() + 86400000 };
  }

  onWarning(handler: WarningHandler): void {
    this.warningHandler = handler;
  }

  startSession(sessionId: string): void {
    this.sessions.set(sessionId, { tokensUsed: 0, turnsUsed: 0, startedAt: Date.now() });
    this.daily.sessionsUsed++;
  }

  addTokens(sessionId: string, tokens: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.tokensUsed += tokens;
    this.daily.tokensUsed += tokens;

    this.checkThresholds(sessionId, session);
  }

  addTurn(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.turnsUsed++;
  }

  private checkThresholds(sessionId: string, session: SessionUsage): void {
    if (!this.warningHandler) return;

    const sessionRatio = session.tokensUsed / this.config.perSession.maxTokens;
    const currentSessionLevel = this.sessionWarned.get(sessionId);

    if (sessionRatio >= BUDGET_CRITICAL_THRESHOLD && currentSessionLevel !== 'critical') {
      this.sessionWarned.set(sessionId, 'critical');
      this.warningHandler({
        level: 'critical',
        scope: 'session',
        tokensUsed: session.tokensUsed,
        tokensLimit: this.config.perSession.maxTokens,
      });
    } else if (sessionRatio >= BUDGET_WARNING_THRESHOLD && !currentSessionLevel) {
      this.sessionWarned.set(sessionId, 'warning');
      this.warningHandler({
        level: 'warning',
        scope: 'session',
        tokensUsed: session.tokensUsed,
        tokensLimit: this.config.perSession.maxTokens,
      });
    }

    const dailyRatio = this.daily.tokensUsed / this.config.daily.maxTokens;
    if (dailyRatio >= BUDGET_CRITICAL_THRESHOLD && this.dailyWarned !== 'critical') {
      this.dailyWarned = 'critical';
      this.warningHandler({
        level: 'critical',
        scope: 'daily',
        tokensUsed: this.daily.tokensUsed,
        tokensLimit: this.config.daily.maxTokens,
      });
    } else if (dailyRatio >= BUDGET_WARNING_THRESHOLD && !this.dailyWarned) {
      this.dailyWarned = 'warning';
      this.warningHandler({
        level: 'warning',
        scope: 'daily',
        tokensUsed: this.daily.tokensUsed,
        tokensLimit: this.config.daily.maxTokens,
      });
    }
  }

  isSessionBudgetExceeded(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return (
      session.tokensUsed > this.config.perSession.maxTokens ||
      session.turnsUsed > this.config.perSession.maxTurns
    );
  }

  isDailyBudgetExceeded(): boolean {
    return (
      this.daily.tokensUsed > this.config.daily.maxTokens ||
      this.daily.sessionsUsed > this.config.daily.maxSessions
    );
  }

  getSessionUsage(sessionId: string): { tokensUsed: number; turnsUsed: number } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return { tokensUsed: session.tokensUsed, turnsUsed: session.turnsUsed };
  }

  getUsage(): { daily: { tokensUsed: number; sessionsUsed: number } } {
    return {
      daily: {
        tokensUsed: this.daily.tokensUsed,
        sessionsUsed: this.daily.sessionsUsed,
      },
    };
  }

  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.sessionWarned.delete(sessionId);
  }

  resetDaily(): void {
    this.daily = { tokensUsed: 0, sessionsUsed: 0, resetAt: Date.now() + 86400000 };
    this.dailyWarned = null;
  }
}
