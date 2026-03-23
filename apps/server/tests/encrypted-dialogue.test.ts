import { describe, it, expect, beforeEach } from 'vitest';
import { DialogueRouter } from '../src/engine/dialogue.js';

describe('DialogueRouter — E2E Encryption', () => {
  let router: DialogueRouter;

  beforeEach(() => {
    router = new DialogueRouter();
  });

  describe('markEncrypted', () => {
    it('marks an active session as encrypted', () => {
      const session = router.createSession('a', 'b', 'secret chat', 'social');
      expect(router.markEncrypted(session.id)).toBe(true);
      expect(session.encrypted).toBe(true);
    });

    it('returns false for non-existent session', () => {
      expect(router.markEncrypted('nonexistent')).toBe(false);
    });

    it('returns false for ended session', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.endSession(session.id, 'completed');
      expect(router.markEncrypted(session.id)).toBe(false);
    });
  });

  describe('isEncrypted', () => {
    it('returns false for non-encrypted session', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      expect(router.isEncrypted(session.id)).toBe(false);
    });

    it('returns true after marking encrypted', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.markEncrypted(session.id);
      expect(router.isEncrypted(session.id)).toBe(true);
    });

    it('returns false for non-existent session', () => {
      expect(router.isEncrypted('nonexistent')).toBe(false);
    });
  });

  describe('addEncryptedMessage', () => {
    it('increments turns and estimates tokens from ciphertext size', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      const msg = router.addEncryptedMessage(session.id, 'a', 100);

      expect(msg).toBeDefined();
      expect(msg!.turnNumber).toBe(1);
      expect(session.turnsUsed).toBe(1);
      expect(session.tokensUsed).toBe(Math.ceil(100 * 1.3));
    });

    it('stores [encrypted] as content placeholder', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.addEncryptedMessage(session.id, 'a', 50);

      const messages = router.getMessages(session.id);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('[encrypted]');
    });

    it('returns undefined for non-existent session', () => {
      expect(router.addEncryptedMessage('nonexistent', 'a', 50)).toBeUndefined();
    });

    it('returns undefined for ended session', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.endSession(session.id, 'completed');
      expect(router.addEncryptedMessage(session.id, 'a', 50)).toBeUndefined();
    });

    it('accumulates turns across encrypted and plaintext messages', () => {
      const session = router.createSession('a', 'b', 'test', 'social');
      router.addMessage(session.id, 'a', 'hello');
      router.addEncryptedMessage(session.id, 'b', 100);

      expect(session.turnsUsed).toBe(2);
      const messages = router.getMessages(session.id);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('hello');
      expect(messages[1].content).toBe('[encrypted]');
    });
  });
});
