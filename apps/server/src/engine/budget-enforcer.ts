import type { BudgetConfig } from '@lobster-world/protocol';
import {
  BUDGET_WARNING_THRESHOLD,
  BUDGET_CRITICAL_THRESHOLD,
} from '@lobster-world/protocol';

export interface BudgetWarningEvent {
  lobsterId: string;
  level: 'warning' | 'critical';
  scope: 'session' | 'daily';
  tokensUsed: number;
  tokensLimit: number;
  sessionsUsed: number;
  sessionsLimit: number;
}

interface SessionBudget {
  tokensUsed: number;
  turnsUsed: number;
}

interface LobsterBudget {
  config: BudgetConfig;
  dailyTokens: number;
  dailySessions: number;
  sessions: Map<string, SessionBudget>;
  sessionWarned: Map<string, 'warning' | 'critical'>;
  dailyWarned: 'warning' | 'critical' | null;
}

type WarningHandler = (event: BudgetWarningEvent) => void;

export class BudgetEnforcer {
  private lobsters = new Map<string, LobsterBudget>();
  private warningHandler: WarningHandler | null = null;

  onBudgetWarning(handler: WarningHandler): void {
    this.warningHandler = handler;
  }

  registerLobster(lobsterId: string, config: BudgetConfig): void {
    this.lobsters.set(lobsterId, {
      config,
      dailyTokens: 0,
      dailySessions: 0,
      sessions: new Map(),
      sessionWarned: new Map(),
      dailyWarned: null,
    });
  }

  hasLobster(lobsterId: string): boolean {
    return this.lobsters.has(lobsterId);
  }

  removeLobster(lobsterId: string): void {
    this.lobsters.delete(lobsterId);
  }

  startSession(lobsterId: string, sessionId: string): void {
    const lb = this.lobsters.get(lobsterId);
    if (!lb) return;
    lb.sessions.set(sessionId, { tokensUsed: 0, turnsUsed: 0 });
    lb.dailySessions++;
  }

  addTokens(lobsterId: string, sessionId: string, tokens: number): void {
    const lb = this.lobsters.get(lobsterId);
    if (!lb) return;
    const session = lb.sessions.get(sessionId);
    if (!session) return;

    session.tokensUsed += tokens;
    lb.dailyTokens += tokens;

    this.checkThresholds(lobsterId, lb, sessionId, session);
  }

  addTurn(lobsterId: string, sessionId: string): void {
    const lb = this.lobsters.get(lobsterId);
    if (!lb) return;
    const session = lb.sessions.get(sessionId);
    if (!session) return;
    session.turnsUsed++;
  }

  private checkThresholds(lobsterId: string, lb: LobsterBudget, sessionId: string, session: SessionBudget): void {
    if (!this.warningHandler) return;

    const sessionRatio = session.tokensUsed / lb.config.perSession.maxTokens;
    const currentSessionLevel = lb.sessionWarned.get(sessionId);

    if (sessionRatio >= BUDGET_CRITICAL_THRESHOLD && currentSessionLevel !== 'critical') {
      lb.sessionWarned.set(sessionId, 'critical');
      this.warningHandler({
        lobsterId,
        level: 'critical',
        scope: 'session',
        tokensUsed: session.tokensUsed,
        tokensLimit: lb.config.perSession.maxTokens,
        sessionsUsed: lb.dailySessions,
        sessionsLimit: lb.config.daily.maxSessions,
      });
    } else if (sessionRatio >= BUDGET_WARNING_THRESHOLD && !currentSessionLevel) {
      lb.sessionWarned.set(sessionId, 'warning');
      this.warningHandler({
        lobsterId,
        level: 'warning',
        scope: 'session',
        tokensUsed: session.tokensUsed,
        tokensLimit: lb.config.perSession.maxTokens,
        sessionsUsed: lb.dailySessions,
        sessionsLimit: lb.config.daily.maxSessions,
      });
    }

    const dailyRatio = lb.dailyTokens / lb.config.daily.maxTokens;
    if (dailyRatio >= BUDGET_CRITICAL_THRESHOLD && lb.dailyWarned !== 'critical') {
      lb.dailyWarned = 'critical';
      this.warningHandler({
        lobsterId,
        level: 'critical',
        scope: 'daily',
        tokensUsed: lb.dailyTokens,
        tokensLimit: lb.config.daily.maxTokens,
        sessionsUsed: lb.dailySessions,
        sessionsLimit: lb.config.daily.maxSessions,
      });
    } else if (dailyRatio >= BUDGET_WARNING_THRESHOLD && !lb.dailyWarned) {
      lb.dailyWarned = 'warning';
      this.warningHandler({
        lobsterId,
        level: 'warning',
        scope: 'daily',
        tokensUsed: lb.dailyTokens,
        tokensLimit: lb.config.daily.maxTokens,
        sessionsUsed: lb.dailySessions,
        sessionsLimit: lb.config.daily.maxSessions,
      });
    }
  }

  isSessionBudgetExceeded(lobsterId: string, sessionId: string): boolean {
    const lb = this.lobsters.get(lobsterId);
    if (!lb) return false;
    const session = lb.sessions.get(sessionId);
    if (!session) return false;
    return (
      session.tokensUsed > lb.config.perSession.maxTokens ||
      session.turnsUsed > lb.config.perSession.maxTurns
    );
  }

  isDailyBudgetExceeded(lobsterId: string): boolean {
    const lb = this.lobsters.get(lobsterId);
    if (!lb) return false;
    return (
      lb.dailyTokens > lb.config.daily.maxTokens ||
      lb.dailySessions > lb.config.daily.maxSessions
    );
  }

  getSessionTokens(lobsterId: string, sessionId: string): number {
    return this.lobsters.get(lobsterId)?.sessions.get(sessionId)?.tokensUsed ?? 0;
  }

  getSessionTurns(lobsterId: string, sessionId: string): number {
    return this.lobsters.get(lobsterId)?.sessions.get(sessionId)?.turnsUsed ?? 0;
  }

  getSessionCount(lobsterId: string): number {
    return this.lobsters.get(lobsterId)?.sessions.size ?? 0;
  }

  getDailyTokens(lobsterId: string): number {
    return this.lobsters.get(lobsterId)?.dailyTokens ?? 0;
  }

  endSession(lobsterId: string, sessionId: string): void {
    const lb = this.lobsters.get(lobsterId);
    if (!lb) return;
    lb.sessions.delete(sessionId);
    lb.sessionWarned.delete(sessionId);
  }
}
