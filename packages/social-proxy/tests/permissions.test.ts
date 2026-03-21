import { describe, it, expect } from 'vitest';
import { PermissionGate } from '../src/permissions.js';
import type { SocialPermissionPolicy, DialogueInvitation } from '@lobster-world/protocol';

const makeInvitation = (fromId: string): DialogueInvitation => ({
  sessionId: 'sess-1',
  from: {
    lobsterId: fromId,
    profile: {
      lobsterId: fromId,
      displayName: 'Test',
      avatar: '',
      bio: '',
      skillTags: [],
      personalitySnippet: '',
      status: 'online',
      partition: 'public',
    },
  },
  intent: 'chat',
  type: 'social',
});

describe('PermissionGate', () => {
  it('auto-accepts from autoAcceptDialogue list', () => {
    const policy: SocialPermissionPolicy = {
      allowProtectedAccess: [],
      autoAcceptDialogue: ['friend-1'],
      blockList: [],
      maxConcurrentDialogues: 3,
    };
    const gate = new PermissionGate(policy);
    const result = gate.evaluateInvitation(makeInvitation('friend-1'), 0);
    expect(result.decision).toBe('accept');
  });

  it('blocks from blockList', () => {
    const policy: SocialPermissionPolicy = {
      allowProtectedAccess: [],
      autoAcceptDialogue: [],
      blockList: ['blocked-1'],
      maxConcurrentDialogues: 3,
    };
    const gate = new PermissionGate(policy);
    const result = gate.evaluateInvitation(makeInvitation('blocked-1'), 0);
    expect(result.decision).toBe('reject');
    expect(result.reason).toContain('blocked');
  });

  it('rejects when at max concurrent dialogues', () => {
    const policy: SocialPermissionPolicy = {
      allowProtectedAccess: [],
      autoAcceptDialogue: [],
      blockList: [],
      maxConcurrentDialogues: 2,
    };
    const gate = new PermissionGate(policy);
    const result = gate.evaluateInvitation(makeInvitation('other-1'), 2);
    expect(result.decision).toBe('reject');
    expect(result.reason).toContain('concurrent');
  });

  it('returns pending for unknown lobster within capacity', () => {
    const policy: SocialPermissionPolicy = {
      allowProtectedAccess: [],
      autoAcceptDialogue: [],
      blockList: [],
      maxConcurrentDialogues: 3,
    };
    const gate = new PermissionGate(policy);
    const result = gate.evaluateInvitation(makeInvitation('stranger-1'), 1);
    expect(result.decision).toBe('pending');
  });

  it('checks protected access', () => {
    const policy: SocialPermissionPolicy = {
      allowProtectedAccess: ['trusted-1'],
      autoAcceptDialogue: [],
      blockList: [],
      maxConcurrentDialogues: 3,
    };
    const gate = new PermissionGate(policy);
    expect(gate.hasProtectedAccess('trusted-1')).toBe(true);
    expect(gate.hasProtectedAccess('stranger-1')).toBe(false);
  });

  it('block check takes priority over auto-accept', () => {
    const policy: SocialPermissionPolicy = {
      allowProtectedAccess: [],
      autoAcceptDialogue: ['frenemy'],
      blockList: ['frenemy'],
      maxConcurrentDialogues: 3,
    };
    const gate = new PermissionGate(policy);
    const result = gate.evaluateInvitation(makeInvitation('frenemy'), 0);
    expect(result.decision).toBe('reject');
  });

  it('updates policy', () => {
    const policy: SocialPermissionPolicy = {
      allowProtectedAccess: [],
      autoAcceptDialogue: [],
      blockList: [],
      maxConcurrentDialogues: 3,
    };
    const gate = new PermissionGate(policy);
    gate.updatePolicy({ blockList: ['new-block'] });
    const result = gate.evaluateInvitation(makeInvitation('new-block'), 0);
    expect(result.decision).toBe('reject');
  });
});
