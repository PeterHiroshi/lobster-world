import type { SocialPermissionPolicy, DialogueInvitation } from '@lobster-world/protocol';

export type PermissionDecision = 'accept' | 'reject' | 'pending';

export interface PermissionResult {
  decision: PermissionDecision;
  reason?: string;
}

export class PermissionGate {
  private policy: SocialPermissionPolicy;

  constructor(policy: SocialPermissionPolicy) {
    this.policy = { ...policy };
  }

  updatePolicy(updates: Partial<SocialPermissionPolicy>): void {
    Object.assign(this.policy, updates);
  }

  getPolicy(): SocialPermissionPolicy {
    return { ...this.policy };
  }

  evaluateInvitation(invitation: DialogueInvitation, currentActiveSessions: number): PermissionResult {
    const fromId = invitation.from.lobsterId;

    // Block check takes priority
    if (this.policy.blockList.includes(fromId)) {
      return { decision: 'reject', reason: `${fromId} is blocked` };
    }

    // Capacity check
    if (currentActiveSessions >= this.policy.maxConcurrentDialogues) {
      return { decision: 'reject', reason: 'Max concurrent dialogues reached' };
    }

    // Auto-accept check
    if (this.policy.autoAcceptDialogue.includes(fromId)) {
      return { decision: 'accept' };
    }

    // Otherwise, needs manual/agent decision
    return { decision: 'pending' };
  }

  hasProtectedAccess(requesterId: string): boolean {
    return this.policy.allowProtectedAccess.includes(requesterId);
  }
}
