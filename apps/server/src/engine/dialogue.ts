import { randomUUID } from 'node:crypto';
import type {
  DialogueSession,
  DialogueMessage,
  DialogueType,
  SessionStats,
} from '@lobster-world/protocol';
import {
  DEFAULT_CIRCUIT_BREAKER,
  TOKEN_ESTIMATION_FACTOR,
} from '../config.js';

function estimateTokens(content: string): number {
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.ceil(wordCount * TOKEN_ESTIMATION_FACTOR);
}

export class DialogueRouter {
  readonly sessions: Map<string, DialogueSession> = new Map();
  readonly messages: Map<string, DialogueMessage[]> = new Map();

  createSession(
    initiatorId: string,
    targetId: string,
    intent: string,
    dialogueType: DialogueType,
  ): DialogueSession {
    const now = Date.now();
    const session: DialogueSession = {
      id: randomUUID(),
      participants: [initiatorId, targetId],
      type: dialogueType,
      intent,
      turnBudget: DEFAULT_CIRCUIT_BREAKER.maxTurnsPerSession,
      turnsUsed: 0,
      tokenBudget: DEFAULT_CIRCUIT_BREAKER.maxTokensPerSession,
      tokensUsed: 0,
      startedAt: now,
      lastActivityAt: now,
      status: 'active',
    };

    this.sessions.set(session.id, session);
    this.messages.set(session.id, []);

    return session;
  }

  markEncrypted(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return false;
    }
    session.encrypted = true;
    return true;
  }

  isEncrypted(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.encrypted === true;
  }

  getSession(sessionId: string): DialogueSession | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): DialogueSession[] {
    return [...this.sessions.values()].filter((s) => s.status === 'active');
  }

  getSessionsForLobster(lobsterId: string): DialogueSession[] {
    return [...this.sessions.values()].filter(
      (s) => s.status === 'active' && s.participants.includes(lobsterId),
    );
  }

  addEncryptedMessage(
    sessionId: string,
    fromId: string,
    ciphertextSize: number,
  ): DialogueMessage | undefined {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return undefined;
    }

    session.turnsUsed += 1;
    session.tokensUsed += Math.ceil(ciphertextSize * TOKEN_ESTIMATION_FACTOR);
    session.lastActivityAt = Date.now();

    const message: DialogueMessage = {
      sessionId,
      fromId,
      content: '[encrypted]',
      timestamp: session.lastActivityAt,
      turnNumber: session.turnsUsed,
    };

    const sessionMessages = this.messages.get(sessionId);
    if (sessionMessages) {
      sessionMessages.push(message);
    }

    return message;
  }

  addMessage(
    sessionId: string,
    fromId: string,
    content: string,
  ): DialogueMessage | undefined {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return undefined;
    }

    session.turnsUsed += 1;
    const tokens = estimateTokens(content);
    session.tokensUsed += tokens;
    session.lastActivityAt = Date.now();

    const message: DialogueMessage = {
      sessionId,
      fromId,
      content,
      timestamp: session.lastActivityAt,
      turnNumber: session.turnsUsed,
    };

    const sessionMessages = this.messages.get(sessionId);
    if (sessionMessages) {
      sessionMessages.push(message);
    }

    return message;
  }

  endSession(
    sessionId: string,
    reason: SessionStats['endReason'],
  ): SessionStats | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    session.status = reason === 'circuit_breaker' ? 'killed' : 'ended';

    const stats: SessionStats = {
      totalTurns: session.turnsUsed,
      totalTokens: session.tokensUsed,
      duration: Date.now() - session.startedAt,
      endReason: reason,
    };

    return stats;
  }

  getMessages(sessionId: string): DialogueMessage[] {
    return this.messages.get(sessionId) ?? [];
  }

  getActiveSessionCount(): number {
    return this.getActiveSessions().length;
  }

  cleanupDisconnected(lobsterId: string): string[] {
    const sessions = this.getSessionsForLobster(lobsterId);
    const endedIds: string[] = [];

    for (const session of sessions) {
      this.endSession(session.id, 'user_ended');
      endedIds.push(session.id);
    }

    return endedIds;
  }
}
