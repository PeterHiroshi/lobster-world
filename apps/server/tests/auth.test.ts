import { describe, it, expect, beforeEach } from 'vitest';
import { AuthManager } from '../src/engine/auth.js';

describe('AuthManager', () => {
  let auth: AuthManager;

  beforeEach(() => {
    auth = new AuthManager();
  });

  it('generates a challenge with nonce and timestamp', () => {
    const challenge = auth.createChallenge();
    expect(typeof challenge.nonce).toBe('string');
    expect(challenge.nonce.length).toBeGreaterThan(0);
    expect(typeof challenge.timestamp).toBe('number');
  });

  it('generates unique nonces', () => {
    const a = auth.createChallenge();
    const b = auth.createChallenge();
    expect(a.nonce).not.toBe(b.nonce);
  });

  it('registers a public key for a lobster', () => {
    auth.registerPublicKey('lobster-1', 'aabbccdd'.repeat(8));
    expect(auth.hasPublicKey('lobster-1')).toBe(true);
  });

  it('verifies auth response with registered key', () => {
    // We'll use tweetnacl for a real key + signature
    const nacl = require('tweetnacl');
    const keypair = nacl.sign.keyPair();
    const publicKeyHex = Buffer.from(keypair.publicKey).toString('hex');
    const lobsterId = 'lobster-1';

    auth.registerPublicKey(lobsterId, publicKeyHex);

    const challenge = auth.createChallenge();
    const message = new TextEncoder().encode(challenge.nonce);
    const signature = nacl.sign.detached(message, keypair.secretKey);
    const signatureHex = Buffer.from(signature).toString('hex');

    const result = auth.verifyAuthResponse({
      lobsterId,
      publicKey: publicKeyHex,
      signature: signatureHex,
    }, challenge.nonce);

    expect(result.valid).toBe(true);
  });

  it('rejects auth response with wrong signature', () => {
    const nacl = require('tweetnacl');
    const keypair = nacl.sign.keyPair();
    const publicKeyHex = Buffer.from(keypair.publicKey).toString('hex');
    const lobsterId = 'lobster-1';

    auth.registerPublicKey(lobsterId, publicKeyHex);

    const challenge = auth.createChallenge();
    const result = auth.verifyAuthResponse({
      lobsterId,
      publicKey: publicKeyHex,
      signature: 'ff'.repeat(64),
    }, challenge.nonce);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid signature');
  });

  it('rejects auth response with unregistered key', () => {
    const result = auth.verifyAuthResponse({
      lobsterId: 'lobster-1',
      publicKey: 'aa'.repeat(32),
      signature: 'bb'.repeat(64),
    }, 'some-nonce');

    // For unregistered lobsters, auto-register the key (first-connect trust)
    // This test verifies the signature is still checked
    expect(result.valid).toBe(false);
  });

  it('supports token-based auth for mock lobsters', () => {
    auth.registerMockToken('mock-1', 'mock-token-123');
    expect(auth.verifyMockToken('mock-1', 'mock-token-123')).toBe(true);
    expect(auth.verifyMockToken('mock-1', 'wrong-token')).toBe(false);
  });

  it('creates session tokens', () => {
    const token = auth.createSessionToken('lobster-1');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(auth.validateSessionToken(token)).toBe('lobster-1');
  });

  it('returns null for invalid session token', () => {
    expect(auth.validateSessionToken('invalid-token')).toBeNull();
  });
});
