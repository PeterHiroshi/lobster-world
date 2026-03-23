import { describe, it, expect } from 'vitest';
import {
  generateX25519KeyPair,
  encrypt,
  decrypt,
  encodeBase64,
  decodeBase64,
} from '../src/crypto.js';
import {
  CRYPTO_KEY_LENGTH,
  CRYPTO_NONCE_LENGTH,
  CRYPTO_MAX_PLAINTEXT_SIZE,
} from '../src/constants.js';

describe('encodeBase64 / decodeBase64', () => {
  it('round-trips arbitrary bytes', () => {
    const data = new Uint8Array([0, 1, 127, 128, 255]);
    const encoded = encodeBase64(data);
    const decoded = decodeBase64(encoded);
    expect(decoded).toEqual(data);
  });

  it('encodes empty array', () => {
    const encoded = encodeBase64(new Uint8Array(0));
    expect(decodeBase64(encoded)).toEqual(new Uint8Array(0));
  });
});

describe('generateX25519KeyPair', () => {
  it('generates keys of the correct length', () => {
    const kp = generateX25519KeyPair();
    expect(kp.publicKey).toHaveLength(CRYPTO_KEY_LENGTH);
    expect(kp.secretKey).toHaveLength(CRYPTO_KEY_LENGTH);
  });

  it('generates unique keypairs', () => {
    const a = generateX25519KeyPair();
    const b = generateX25519KeyPair();
    expect(encodeBase64(a.publicKey)).not.toBe(encodeBase64(b.publicKey));
  });

  it('returns Uint8Array instances', () => {
    const kp = generateX25519KeyPair();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
  });
});

describe('encrypt / decrypt', () => {
  it('encrypts and decrypts a simple message', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();

    const plaintext = 'Hello, Bob!';
    const encrypted = encrypt(plaintext, bob.publicKey, alice.secretKey);
    const decrypted = decrypt(encrypted, alice.publicKey, bob.secretKey);

    expect(decrypted).toBe(plaintext);
  });

  it('produces base64-encoded nonce and ciphertext', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();

    const encrypted = encrypt('test', bob.publicKey, alice.secretKey);
    expect(typeof encrypted.nonce).toBe('string');
    expect(typeof encrypted.ciphertext).toBe('string');
    expect(typeof encrypted.senderPublicKey).toBe('string');

    const nonceBytes = decodeBase64(encrypted.nonce);
    expect(nonceBytes).toHaveLength(CRYPTO_NONCE_LENGTH);
  });

  it('includes senderPublicKey matching the sender', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();

    const encrypted = encrypt('test', bob.publicKey, alice.secretKey);
    const senderPubKeyBytes = decodeBase64(encrypted.senderPublicKey);
    expect(senderPubKeyBytes).toEqual(alice.publicKey);
  });

  it('handles unicode content', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();

    const plaintext = 'Hello! Lobster World is great.';
    const encrypted = encrypt(plaintext, bob.publicKey, alice.secretKey);
    const decrypted = decrypt(encrypted, alice.publicKey, bob.secretKey);
    expect(decrypted).toBe(plaintext);
  });

  it('handles empty string', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();

    const encrypted = encrypt('', bob.publicKey, alice.secretKey);
    const decrypted = decrypt(encrypted, alice.publicKey, bob.secretKey);
    expect(decrypted).toBe('');
  });

  it('fails decryption with wrong recipient key', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const eve = generateX25519KeyPair();

    const encrypted = encrypt('secret', bob.publicKey, alice.secretKey);
    expect(() => decrypt(encrypted, alice.publicKey, eve.secretKey)).toThrow(
      'Decryption failed',
    );
  });

  it('fails decryption with wrong sender public key', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const eve = generateX25519KeyPair();

    const encrypted = encrypt('secret', bob.publicKey, alice.secretKey);
    expect(() => decrypt(encrypted, eve.publicKey, bob.secretKey)).toThrow(
      'Decryption failed',
    );
  });

  it('fails decryption with tampered ciphertext', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();

    const encrypted = encrypt('secret', bob.publicKey, alice.secretKey);
    const tamperedBytes = decodeBase64(encrypted.ciphertext);
    tamperedBytes[0] ^= 0xff;
    const tampered = { ...encrypted, ciphertext: encodeBase64(tamperedBytes) };

    expect(() => decrypt(tampered, alice.publicKey, bob.secretKey)).toThrow(
      'Decryption failed',
    );
  });

  it('fails decryption with tampered nonce', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();

    const encrypted = encrypt('secret', bob.publicKey, alice.secretKey);
    const tamperedNonce = decodeBase64(encrypted.nonce);
    tamperedNonce[0] ^= 0xff;
    const tampered = { ...encrypted, nonce: encodeBase64(tamperedNonce) };

    expect(() => decrypt(tampered, alice.publicKey, bob.secretKey)).toThrow(
      'Decryption failed',
    );
  });

  it('produces different ciphertext for the same plaintext (random nonce)', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();

    const enc1 = encrypt('same text', bob.publicKey, alice.secretKey);
    const enc2 = encrypt('same text', bob.publicKey, alice.secretKey);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.nonce).not.toBe(enc2.nonce);
  });
});

describe('encrypt validation', () => {
  it('rejects invalid recipient public key length', () => {
    const alice = generateX25519KeyPair();
    const badKey = new Uint8Array(16);

    expect(() => encrypt('test', badKey, alice.secretKey)).toThrow(
      `Recipient public key must be ${CRYPTO_KEY_LENGTH} bytes`,
    );
  });

  it('rejects invalid sender secret key length', () => {
    const bob = generateX25519KeyPair();
    const badKey = new Uint8Array(16);

    expect(() => encrypt('test', bob.publicKey, badKey)).toThrow(
      `Sender secret key must be ${CRYPTO_KEY_LENGTH} bytes`,
    );
  });

  it('rejects plaintext exceeding max size', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const oversized = 'x'.repeat(CRYPTO_MAX_PLAINTEXT_SIZE + 1);

    expect(() => encrypt(oversized, bob.publicKey, alice.secretKey)).toThrow(
      `Plaintext exceeds maximum size of ${CRYPTO_MAX_PLAINTEXT_SIZE} bytes`,
    );
  });

  it('allows plaintext at exactly max size', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const maxText = 'x'.repeat(CRYPTO_MAX_PLAINTEXT_SIZE);

    const encrypted = encrypt(maxText, bob.publicKey, alice.secretKey);
    const decrypted = decrypt(encrypted, alice.publicKey, bob.secretKey);
    expect(decrypted).toBe(maxText);
  });
});

describe('decrypt validation', () => {
  it('rejects invalid sender public key length', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const encrypted = encrypt('test', bob.publicKey, alice.secretKey);

    expect(() => decrypt(encrypted, new Uint8Array(16), bob.secretKey)).toThrow(
      `Sender public key must be ${CRYPTO_KEY_LENGTH} bytes`,
    );
  });

  it('rejects invalid recipient secret key length', () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const encrypted = encrypt('test', bob.publicKey, alice.secretKey);

    expect(() => decrypt(encrypted, alice.publicKey, new Uint8Array(16))).toThrow(
      `Recipient secret key must be ${CRYPTO_KEY_LENGTH} bytes`,
    );
  });
});
