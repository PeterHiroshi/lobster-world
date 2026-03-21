import type { SocialPermissionPolicy, DialogueType } from '@lobster-world/protocol';
import { DIALOGUE_CONSENT_TIMEOUT_MS } from '@lobster-world/protocol';
import crypto from 'node:crypto';

export type ConsentDecision = 'accept' | 'reject' | 'pending';

export interface ConsentResult {
  decision: ConsentDecision;
  sessionId?: string;
  reason?: string;
}

interface PendingConsent {
  sessionId: string;
  initiatorId: string;
  targetId: string;
  intent: string;
  dialogueType: DialogueType;
  timer: ReturnType<typeof setTimeout>;
}

type TimeoutHandler = (sessionId: string) => void;

export class ConsentManager {
  private pending = new Map<string, PendingConsent>();
  private timeoutHandler: TimeoutHandler | null = null;

  onTimeout(handler: TimeoutHandler): void {
    this.timeoutHandler = handler;
  }

  requestDialogue(
    initiatorId: string,
    targetId: string,
    targetPermissions: SocialPermissionPolicy,
    targetActiveSessions: number,
    intent: string,
    dialogueType: DialogueType,
  ): ConsentResult {
    const sessionId = crypto.randomUUID();

    // Block check takes priority
    if (targetPermissions.blockList.includes(initiatorId)) {
      return { decision: 'reject', sessionId, reason: `${initiatorId} is blocked` };
    }

    // Capacity check
    if (targetActiveSessions >= targetPermissions.maxConcurrentDialogues) {
      return { decision: 'reject', sessionId, reason: 'Max concurrent dialogues reached' };
    }

    // Auto-accept check
    if (targetPermissions.autoAcceptDialogue.includes(initiatorId)) {
      return { decision: 'accept', sessionId };
    }

    // Pending — wait for target response
    const timer = setTimeout(() => {
      if (this.pending.has(sessionId)) {
        this.pending.delete(sessionId);
        this.timeoutHandler?.(sessionId);
      }
    }, DIALOGUE_CONSENT_TIMEOUT_MS);

    this.pending.set(sessionId, {
      sessionId,
      initiatorId,
      targetId,
      intent,
      dialogueType,
      timer,
    });

    return { decision: 'pending', sessionId };
  }

  resolveConsent(sessionId: string, accepted: boolean, reason?: string): boolean {
    const entry = this.pending.get(sessionId);
    if (!entry) {
      return false;
    }

    clearTimeout(entry.timer);
    this.pending.delete(sessionId);
    return true;
  }

  getPendingConsent(sessionId: string): PendingConsent | undefined {
    return this.pending.get(sessionId);
  }

  dispose(): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
    }
    this.pending.clear();
  }
}
