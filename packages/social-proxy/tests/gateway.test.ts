import { describe, it, expect, vi } from 'vitest';
import { MessageGateway } from '../src/gateway.js';
import type { DialogueInvitation, DialogueConsentResponse } from '@lobster-world/protocol';

describe('MessageGateway', () => {
  const invitation: DialogueInvitation = {
    sessionId: 'sess-1',
    from: {
      lobsterId: 'lobster-2',
      profile: {
        lobsterId: 'lobster-2',
        displayName: 'Suki',
        avatar: 'suki.png',
        bio: 'A social lobster',
        skillTags: ['design'],
        personalitySnippet: 'Creative',
        status: 'online',
        partition: 'public',
      },
    },
    intent: 'discuss design',
    type: 'social',
  };

  it('handles incoming dialogue invitation via callback', () => {
    const gw = new MessageGateway();
    const handler = vi.fn();
    gw.onInvitation(handler);

    gw.receiveInvitation(invitation);
    expect(handler).toHaveBeenCalledWith(invitation);
  });

  it('queues invitations when no handler set', () => {
    const gw = new MessageGateway();
    gw.receiveInvitation(invitation);

    const handler = vi.fn();
    gw.onInvitation(handler);

    gw.processPendingInvitations();
    expect(handler).toHaveBeenCalledWith(invitation);
  });

  it('handles incoming dialogue message', () => {
    const gw = new MessageGateway();
    const handler = vi.fn();
    gw.onMessage(handler);

    gw.receiveMessage('sess-1', 'lobster-2', 'Hello!', 1);
    expect(handler).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      from: 'lobster-2',
      content: 'Hello!',
      turnNumber: 1,
    });
  });

  it('handles dialogue ended notification', () => {
    const gw = new MessageGateway();
    const handler = vi.fn();
    gw.onDialogueEnded(handler);

    gw.receiveDialogueEnded('sess-1', 'completed');
    expect(handler).toHaveBeenCalledWith({ sessionId: 'sess-1', reason: 'completed' });
  });

  it('creates accept response', () => {
    const gw = new MessageGateway();
    const response = gw.acceptInvitation('sess-1');
    expect(response).toEqual({ sessionId: 'sess-1', accepted: true });
  });

  it('creates reject response with reason', () => {
    const gw = new MessageGateway();
    const response = gw.rejectInvitation('sess-1', 'too busy');
    expect(response).toEqual({ sessionId: 'sess-1', accepted: false, reason: 'too busy' });
  });

  it('tracks active sessions', () => {
    const gw = new MessageGateway();
    expect(gw.getActiveSessions()).toEqual([]);

    gw.addActiveSession('sess-1');
    gw.addActiveSession('sess-2');
    expect(gw.getActiveSessions()).toEqual(['sess-1', 'sess-2']);

    gw.removeActiveSession('sess-1');
    expect(gw.getActiveSessions()).toEqual(['sess-2']);
  });
});
