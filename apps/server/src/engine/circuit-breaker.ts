import {
  CircuitBreakerConfig,
  DialogueSession,
  DEFAULT_CIRCUIT_BREAKER,
} from '@lobster-world/protocol';
import {
  REPEAT_HISTORY_LENGTH,
  CONSECUTIVE_REPEATS_TO_KILL,
} from '../config.js';

export interface CheckResult {
  allowed: boolean;
  reason?: string;
}

export class CircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  readonly messageHistory: Map<string, string[]> = new Map();
  readonly killCooldowns: Map<string, number> = new Map();
  readonly activeSessions: Map<string, Set<string>> = new Map();

  constructor(config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER) {
    this.config = config;
  }

  checkSession(session: DialogueSession): CheckResult {
    if (session.turnsUsed >= session.turnBudget) {
      return { allowed: false, reason: 'Turn budget exceeded' };
    }
    if (session.tokensUsed >= session.tokenBudget) {
      return { allowed: false, reason: 'Token budget exceeded' };
    }
    const elapsed = Date.now() - session.startedAt;
    if (elapsed >= this.config.maxSessionDurationMs) {
      return { allowed: false, reason: 'Session duration exceeded' };
    }
    return { allowed: true };
  }

  checkMessage(lobsterId: string, content: string): CheckResult {
    const history = this.messageHistory.get(lobsterId) ?? [];

    // Check if we have enough history to detect repeats
    const requiredPrevious = CONSECUTIVE_REPEATS_TO_KILL - 1;
    if (history.length >= requiredPrevious) {
      const recentMessages = history.slice(-requiredPrevious);
      const allSimilar = recentMessages.every(
        (msg) =>
          this.computeSimilarity(msg, content) >=
          this.config.semanticRepeatThreshold,
      );
      if (allSimilar) {
        // Still add the message to history before returning
        history.push(content);
        if (history.length > REPEAT_HISTORY_LENGTH) {
          history.splice(0, history.length - REPEAT_HISTORY_LENGTH);
        }
        this.messageHistory.set(lobsterId, history);
        return {
          allowed: false,
          reason: 'Repetitive message detected',
        };
      }
    }

    // Add message to history
    history.push(content);
    if (history.length > REPEAT_HISTORY_LENGTH) {
      history.splice(0, history.length - REPEAT_HISTORY_LENGTH);
    }
    this.messageHistory.set(lobsterId, history);

    return { allowed: true };
  }

  canStartSession(lobsterId: string): CheckResult {
    // Check cooldown
    const cooldownExpiry = this.killCooldowns.get(lobsterId);
    if (cooldownExpiry !== undefined && Date.now() < cooldownExpiry) {
      return { allowed: false, reason: 'Cooldown active after session kill' };
    }

    // Check concurrent session limit
    const sessions = this.activeSessions.get(lobsterId);
    if (sessions && sessions.size >= this.config.maxConcurrentSessions) {
      return { allowed: false, reason: 'Concurrent session limit reached' };
    }

    return { allowed: true };
  }

  trackSessionStart(lobsterId: string, sessionId: string): void {
    let sessions = this.activeSessions.get(lobsterId);
    if (!sessions) {
      sessions = new Set();
      this.activeSessions.set(lobsterId, sessions);
    }
    sessions.add(sessionId);
  }

  trackSessionEnd(
    lobsterId: string,
    sessionId: string,
    wasKilled: boolean,
  ): void {
    const sessions = this.activeSessions.get(lobsterId);
    if (sessions) {
      sessions.delete(sessionId);
    }
    if (wasKilled) {
      this.killCooldowns.set(
        lobsterId,
        Date.now() + this.config.cooldownAfterKillMs,
      );
    }
  }

  clearHistory(lobsterId: string): void {
    this.messageHistory.delete(lobsterId);
  }

  computeSimilarity(a: string, b: string): number {
    const wordsA = a.toLowerCase().split(/\s+/).filter(Boolean);
    const wordsB = b.toLowerCase().split(/\s+/).filter(Boolean);

    if (wordsA.length === 0 || wordsB.length === 0) {
      return 0;
    }

    // Build word frequency maps
    const freqA = new Map<string, number>();
    for (const word of wordsA) {
      freqA.set(word, (freqA.get(word) ?? 0) + 1);
    }

    const freqB = new Map<string, number>();
    for (const word of wordsB) {
      freqB.set(word, (freqB.get(word) ?? 0) + 1);
    }

    // Compute dot product
    let dot = 0;
    for (const [word, countA] of freqA) {
      const countB = freqB.get(word);
      if (countB !== undefined) {
        dot += countA * countB;
      }
    }

    // Compute magnitudes
    let magA = 0;
    for (const count of freqA.values()) {
      magA += count * count;
    }
    magA = Math.sqrt(magA);

    let magB = 0;
    for (const count of freqB.values()) {
      magB += count * count;
    }
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) {
      return 0;
    }

    return dot / (magA * magB);
  }
}
