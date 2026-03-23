// --- E2E Encryption Types ---

export interface CryptoKeyPair {
  publicKey: Uint8Array;   // X25519 public key (32 bytes)
  secretKey: Uint8Array;   // X25519 secret key (32 bytes)
}

export interface EncryptedMessage {
  nonce: string;           // base64-encoded 24-byte nonce
  ciphertext: string;      // base64-encoded encrypted content
  senderPublicKey: string; // base64-encoded sender X25519 public key
}

export interface KeyExchangeRequest {
  type: 'key_exchange_request';
  sessionId: string;
  publicKey: string;       // base64 X25519 public
}

export interface KeyExchangeResponse {
  type: 'key_exchange_response';
  sessionId: string;
  publicKey: string;       // base64 X25519 public
  accepted: boolean;
}

export interface EncryptedDialogueMessage {
  type: 'encrypted_dialogue';
  sessionId: string;
  from: string;
  to: string;
  encrypted: EncryptedMessage;
  timestamp: number;
}

export interface PublicKeyRecord {
  lobsterId: string;
  x25519PublicKey: string; // base64-encoded
  updatedAt: number;
}
