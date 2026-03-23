import { describe, it, expect, beforeEach } from 'vitest';
import { E2EEncryptionManager } from '../src/e2e-encryption.js';

describe('E2EEncryptionManager', () => {
  let alice: E2EEncryptionManager;
  let bob: E2EEncryptionManager;
  const sessionId = 'session-001';

  beforeEach(() => {
    alice = new E2EEncryptionManager();
    bob = new E2EEncryptionManager();
  });

  function establishSession(): void {
    const request = alice.initiateKeyExchange(sessionId);
    const response = bob.handleKeyExchangeRequest(sessionId, request.publicKey);
    alice.handleKeyExchangeResponse(sessionId, response.publicKey, response.accepted);
  }

  describe('key exchange', () => {
    it('initiates key exchange and returns a request', () => {
      const request = alice.initiateKeyExchange(sessionId);
      expect(request.type).toBe('key_exchange_request');
      expect(request.sessionId).toBe(sessionId);
      expect(request.publicKey).toBeTruthy();
    });

    it('handles incoming key exchange request', () => {
      const request = alice.initiateKeyExchange(sessionId);
      const response = bob.handleKeyExchangeRequest(sessionId, request.publicKey);
      expect(response.type).toBe('key_exchange_response');
      expect(response.sessionId).toBe(sessionId);
      expect(response.accepted).toBe(true);
      expect(response.publicKey).toBeTruthy();
    });

    it('completes key exchange from both sides', () => {
      establishSession();
      expect(alice.isEstablished(sessionId)).toBe(true);
      expect(bob.isEstablished(sessionId)).toBe(true);
    });

    it('handles rejected key exchange', () => {
      alice.initiateKeyExchange(sessionId);
      const result = alice.handleKeyExchangeResponse(sessionId, '', false);
      expect(result).toBe(false);
      expect(alice.isEstablished(sessionId)).toBe(false);
    });

    it('returns false for response on unknown session', () => {
      const result = alice.handleKeyExchangeResponse('unknown', 'key', true);
      expect(result).toBe(false);
    });
  });

  describe('encrypt / decrypt', () => {
    it('alice encrypts, bob decrypts', () => {
      establishSession();
      const encrypted = alice.encryptMessage(sessionId, 'Hello Bob!');
      const decrypted = bob.decryptMessage(sessionId, encrypted);
      expect(decrypted).toBe('Hello Bob!');
    });

    it('bob encrypts, alice decrypts', () => {
      establishSession();
      const encrypted = bob.encryptMessage(sessionId, 'Hello Alice!');
      const decrypted = alice.decryptMessage(sessionId, encrypted);
      expect(decrypted).toBe('Hello Alice!');
    });

    it('handles multi-turn dialogue', () => {
      establishSession();
      const msg1 = alice.encryptMessage(sessionId, 'Turn 1');
      expect(bob.decryptMessage(sessionId, msg1)).toBe('Turn 1');

      const msg2 = bob.encryptMessage(sessionId, 'Turn 2');
      expect(alice.decryptMessage(sessionId, msg2)).toBe('Turn 2');

      const msg3 = alice.encryptMessage(sessionId, 'Turn 3');
      expect(bob.decryptMessage(sessionId, msg3)).toBe('Turn 3');
    });

    it('handles unicode content', () => {
      establishSession();
      const text = 'Lobster World is great!';
      const encrypted = alice.encryptMessage(sessionId, text);
      expect(bob.decryptMessage(sessionId, encrypted)).toBe(text);
    });

    it('throws when encrypting on unestablished session', () => {
      alice.initiateKeyExchange(sessionId);
      expect(() => alice.encryptMessage(sessionId, 'test')).toThrow(
        'No established E2E session',
      );
    });

    it('throws when decrypting on unestablished session', () => {
      const encrypted = {
        nonce: 'fake',
        ciphertext: 'fake',
        senderPublicKey: 'fake',
      };
      expect(() => alice.decryptMessage('unknown', encrypted)).toThrow(
        'No established E2E session',
      );
    });

    it('cannot decrypt with third party', () => {
      establishSession();
      const eve = new E2EEncryptionManager();

      const encrypted = alice.encryptMessage(sessionId, 'secret');

      // Eve tries to establish her own session (not with correct keys)
      eve.initiateKeyExchange(sessionId);
      // Eve can't decrypt because she has wrong keys — no established session
      expect(() => eve.decryptMessage(sessionId, encrypted)).toThrow(
        'No established E2E session',
      );
    });
  });

  describe('session management', () => {
    it('returns public key for an active session', () => {
      alice.initiateKeyExchange(sessionId);
      const pk = alice.getPublicKey(sessionId);
      expect(pk).toBeTruthy();
      expect(typeof pk).toBe('string');
    });

    it('returns undefined for unknown session', () => {
      expect(alice.getPublicKey('unknown')).toBeUndefined();
    });

    it('ends a session and cleans up', () => {
      establishSession();
      alice.endSession(sessionId);
      expect(alice.isEstablished(sessionId)).toBe(false);
      expect(alice.getPublicKey(sessionId)).toBeUndefined();
    });

    it('tracks active session ids', () => {
      establishSession();
      const session2 = 'session-002';
      const req2 = alice.initiateKeyExchange(session2);
      bob.handleKeyExchangeRequest(session2, req2.publicKey);
      // session2 not yet established on alice's side

      expect(alice.getActiveSessionIds()).toEqual([sessionId]);
    });

    it('per-session key rotation (different keys per session)', () => {
      establishSession();

      const session2 = 'session-002';
      const req2 = alice.initiateKeyExchange(session2);
      const res2 = bob.handleKeyExchangeRequest(session2, req2.publicKey);
      alice.handleKeyExchangeResponse(session2, res2.publicKey, res2.accepted);

      const pk1 = alice.getPublicKey(sessionId);
      const pk2 = alice.getPublicKey(session2);
      expect(pk1).not.toBe(pk2);
    });
  });
});
