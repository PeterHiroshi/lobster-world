import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsentManager } from '../src/engine/consent.js';
import type { SocialPermissionPolicy, SocialProfile, DialogueType } from '@lobster-world/protocol';
import { DIALOGUE_CONSENT_TIMEOUT_MS } from '@lobster-world/protocol';

const defaultPerms: SocialPermissionPolicy = {
  allowProtectedAccess: [],
  autoAcceptDialogue: [],
  blockList: [],
  maxConcurrentDialogues: 3,
};

const makeProfile = (id: string): SocialProfile => ({
  lobsterId: id,
  displayName: `Lobster ${id}`,
  avatar: '',
  bio: '',
  skillTags: [],
  personalitySnippet: '',
  status: 'online',
  partition: 'public',
});

describe('ConsentManager', () => {
  let consent: ConsentManager;

  beforeEach(() => {
    consent = new ConsentManager();
    vi.useFakeTimers();
  });

  it('auto-accepts when target has initiator in autoAcceptDialogue', () => {
    const perms: SocialPermissionPolicy = { ...defaultPerms, autoAcceptDialogue: ['lobster-a'] };
    const result = consent.requestDialogue('lobster-a', 'lobster-b', perms, 0, 'chat', 'social');
    expect(result.decision).toBe('accept');
    expect(result.sessionId).toBeTruthy();
  });

  it('auto-rejects when target has initiator blocked', () => {
    const perms: SocialPermissionPolicy = { ...defaultPerms, blockList: ['lobster-a'] };
    const result = consent.requestDialogue('lobster-a', 'lobster-b', perms, 0, 'chat', 'social');
    expect(result.decision).toBe('reject');
    expect(result.reason).toContain('blocked');
  });

  it('auto-rejects when target at max concurrent dialogues', () => {
    const perms: SocialPermissionPolicy = { ...defaultPerms, maxConcurrentDialogues: 1 };
    const result = consent.requestDialogue('lobster-a', 'lobster-b', perms, 1, 'chat', 'social');
    expect(result.decision).toBe('reject');
    expect(result.reason).toContain('concurrent');
  });

  it('returns pending for unknown initiator', () => {
    const result = consent.requestDialogue('lobster-a', 'lobster-b', defaultPerms, 0, 'chat', 'social');
    expect(result.decision).toBe('pending');
    expect(result.sessionId).toBeTruthy();
  });

  it('resolves pending consent as accepted', () => {
    const request = consent.requestDialogue('lobster-a', 'lobster-b', defaultPerms, 0, 'chat', 'social');
    expect(request.decision).toBe('pending');

    const resolved = consent.resolveConsent(request.sessionId!, true);
    expect(resolved).toBe(true);
  });

  it('resolves pending consent as rejected', () => {
    const request = consent.requestDialogue('lobster-a', 'lobster-b', defaultPerms, 0, 'chat', 'social');
    const resolved = consent.resolveConsent(request.sessionId!, false, 'not interested');
    expect(resolved).toBe(true);
  });

  it('returns false for resolving non-existent session', () => {
    const resolved = consent.resolveConsent('nonexistent', true);
    expect(resolved).toBe(false);
  });

  it('times out pending requests after timeout', () => {
    const handler = vi.fn();
    consent.onTimeout(handler);

    const request = consent.requestDialogue('lobster-a', 'lobster-b', defaultPerms, 0, 'chat', 'social');

    vi.advanceTimersByTime(DIALOGUE_CONSENT_TIMEOUT_MS + 100);

    expect(handler).toHaveBeenCalledWith(request.sessionId);
  });

  it('does not time out accepted requests', () => {
    const handler = vi.fn();
    consent.onTimeout(handler);

    const request = consent.requestDialogue('lobster-a', 'lobster-b', defaultPerms, 0, 'chat', 'social');
    consent.resolveConsent(request.sessionId!, true);

    vi.advanceTimersByTime(DIALOGUE_CONSENT_TIMEOUT_MS + 100);

    expect(handler).not.toHaveBeenCalled();
  });

  it('cleans up on dispose', () => {
    consent.requestDialogue('lobster-a', 'lobster-b', defaultPerms, 0, 'chat', 'social');
    consent.dispose();
    // Should not throw
  });
});
