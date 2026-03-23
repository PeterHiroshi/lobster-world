import type { DialogueType } from './social.js';

export type { DialogueType };

export type DialogueStatus = 'active' | 'paused' | 'ended' | 'killed';

export interface DialogueSession {
  id: string;
  participants: string[];
  type: DialogueType;
  intent: string;
  turnBudget: number;
  turnsUsed: number;
  tokenBudget: number;
  tokensUsed: number;
  startedAt: number;
  lastActivityAt: number;
  status: DialogueStatus;
  encrypted?: boolean;
}

export interface DialogueMessage {
  sessionId: string;
  fromId: string;
  content: string;
  timestamp: number;
  turnNumber: number;
}

export interface SessionStats {
  totalTurns: number;
  totalTokens: number;
  duration: number;
  endReason: 'completed' | 'budget_exceeded' | 'circuit_breaker' | 'user_ended' | 'timeout';
}
