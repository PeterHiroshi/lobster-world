import type { DialogueInvitation, DialogueConsentResponse } from '@lobster-world/protocol';

export interface IncomingMessage {
  sessionId: string;
  from: string;
  content: string;
  turnNumber: number;
}

export interface DialogueEndedInfo {
  sessionId: string;
  reason: string;
}

type InvitationHandler = (invitation: DialogueInvitation) => void;
type MessageHandler = (message: IncomingMessage) => void;
type DialogueEndedHandler = (info: DialogueEndedInfo) => void;

export class MessageGateway {
  private invitationHandler: InvitationHandler | null = null;
  private messageHandler: MessageHandler | null = null;
  private dialogueEndedHandler: DialogueEndedHandler | null = null;
  private pendingInvitations: DialogueInvitation[] = [];
  private activeSessions: string[] = [];

  onInvitation(handler: InvitationHandler): void {
    this.invitationHandler = handler;
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  onDialogueEnded(handler: DialogueEndedHandler): void {
    this.dialogueEndedHandler = handler;
  }

  receiveInvitation(invitation: DialogueInvitation): void {
    if (this.invitationHandler) {
      this.invitationHandler(invitation);
    } else {
      this.pendingInvitations.push(invitation);
    }
  }

  processPendingInvitations(): void {
    if (!this.invitationHandler) return;
    for (const inv of this.pendingInvitations) {
      this.invitationHandler(inv);
    }
    this.pendingInvitations = [];
  }

  receiveMessage(sessionId: string, from: string, content: string, turnNumber: number): void {
    this.messageHandler?.({ sessionId, from, content, turnNumber });
  }

  receiveDialogueEnded(sessionId: string, reason: string): void {
    this.dialogueEndedHandler?.({ sessionId, reason });
  }

  acceptInvitation(sessionId: string): DialogueConsentResponse {
    return { sessionId, accepted: true };
  }

  rejectInvitation(sessionId: string, reason?: string): DialogueConsentResponse {
    return { sessionId, accepted: false, reason };
  }

  addActiveSession(sessionId: string): void {
    this.activeSessions.push(sessionId);
  }

  removeActiveSession(sessionId: string): void {
    this.activeSessions = this.activeSessions.filter((id) => id !== sessionId);
  }

  getActiveSessions(): string[] {
    return [...this.activeSessions];
  }
}
