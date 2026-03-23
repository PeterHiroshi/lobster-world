import nacl from 'tweetnacl';
import type { CryptoKeyPair, EncryptedMessage } from './types/crypto.js';
import { CRYPTO_KEY_LENGTH, CRYPTO_MAX_PLAINTEXT_SIZE } from './constants.js';

export function generateX25519KeyPair(): CryptoKeyPair {
  const kp = nacl.box.keyPair();
  return {
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
  };
}

export function encodeBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

export function decodeBase64(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

export function encrypt(
  plaintext: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array,
): EncryptedMessage {
  if (recipientPublicKey.length !== CRYPTO_KEY_LENGTH) {
    throw new Error(`Recipient public key must be ${CRYPTO_KEY_LENGTH} bytes`);
  }
  if (senderSecretKey.length !== CRYPTO_KEY_LENGTH) {
    throw new Error(`Sender secret key must be ${CRYPTO_KEY_LENGTH} bytes`);
  }

  const plaintextBytes = new TextEncoder().encode(plaintext);
  if (plaintextBytes.length > CRYPTO_MAX_PLAINTEXT_SIZE) {
    throw new Error(`Plaintext exceeds maximum size of ${CRYPTO_MAX_PLAINTEXT_SIZE} bytes`);
  }

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const ciphertext = nacl.box(plaintextBytes, nonce, recipientPublicKey, senderSecretKey);

  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(ciphertext),
    senderPublicKey: encodeBase64(
      nacl.box.keyPair.fromSecretKey(senderSecretKey).publicKey,
    ),
  };
}

export function decrypt(
  encrypted: EncryptedMessage,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array,
): string {
  if (senderPublicKey.length !== CRYPTO_KEY_LENGTH) {
    throw new Error(`Sender public key must be ${CRYPTO_KEY_LENGTH} bytes`);
  }
  if (recipientSecretKey.length !== CRYPTO_KEY_LENGTH) {
    throw new Error(`Recipient secret key must be ${CRYPTO_KEY_LENGTH} bytes`);
  }

  const nonce = decodeBase64(encrypted.nonce);
  const ciphertext = decodeBase64(encrypted.ciphertext);

  const plaintext = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey);
  if (!plaintext) {
    throw new Error('Decryption failed — invalid key or tampered message');
  }

  return new TextDecoder().decode(plaintext);
}
