import { describe, it, expect } from 'vitest';
import { CryptoManager } from '../src/crypto.js';

describe('CryptoManager', () => {
  it('generates a keypair with 64-byte secret and 32-byte public key', () => {
    const cm = new CryptoManager();
    const keypair = cm.generateKeypair();
    // hex: 128 chars for secret (64 bytes), 64 chars for public (32 bytes)
    expect(keypair.publicKey).toHaveLength(64);
    expect(keypair.secretKey).toHaveLength(128);
  });

  it('generates unique keypairs each time', () => {
    const cm = new CryptoManager();
    const a = cm.generateKeypair();
    const b = cm.generateKeypair();
    expect(a.publicKey).not.toBe(b.publicKey);
  });

  it('signs a nonce and produces a valid hex signature', () => {
    const cm = new CryptoManager();
    const keypair = cm.generateKeypair();
    const nonce = 'test-nonce-12345';
    const signature = cm.signNonce(nonce, keypair.secretKey);
    // Ed25519 signature: 64 bytes = 128 hex chars
    expect(signature).toHaveLength(128);
  });

  it('verifies a valid signature', () => {
    const cm = new CryptoManager();
    const keypair = cm.generateKeypair();
    const nonce = 'hello-world';
    const signature = cm.signNonce(nonce, keypair.secretKey);
    const valid = cm.verifySignature(nonce, signature, keypair.publicKey);
    expect(valid).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const cm = new CryptoManager();
    const keypair = cm.generateKeypair();
    const nonce = 'hello-world';
    const signature = cm.signNonce(nonce, keypair.secretKey);
    // Tamper with signature
    const tampered = 'ff' + signature.slice(2);
    const valid = cm.verifySignature(nonce, tampered, keypair.publicKey);
    expect(valid).toBe(false);
  });

  it('rejects signature with wrong public key', () => {
    const cm = new CryptoManager();
    const keypairA = cm.generateKeypair();
    const keypairB = cm.generateKeypair();
    const nonce = 'test-nonce';
    const signature = cm.signNonce(nonce, keypairA.secretKey);
    const valid = cm.verifySignature(nonce, signature, keypairB.publicKey);
    expect(valid).toBe(false);
  });

  it('rejects signature for different nonce', () => {
    const cm = new CryptoManager();
    const keypair = cm.generateKeypair();
    const signature = cm.signNonce('nonce-1', keypair.secretKey);
    const valid = cm.verifySignature('nonce-2', signature, keypair.publicKey);
    expect(valid).toBe(false);
  });

  it('handles malformed hex gracefully', () => {
    const cm = new CryptoManager();
    const keypair = cm.generateKeypair();
    expect(cm.verifySignature('nonce', 'not-hex', keypair.publicKey)).toBe(false);
    expect(cm.verifySignature('nonce', '1234', keypair.publicKey)).toBe(false);
  });
});
