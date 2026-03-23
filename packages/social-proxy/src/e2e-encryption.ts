import {
  generateX25519KeyPair,
  encrypt,
  decrypt,
  encodeBase64,
  decodeBase64,
} from '@lobster-world/protocol';
import type {
  CryptoKeyPair,
  EncryptedMessage,
  KeyExchangeRequest,
  KeyExchangeResponse,
} from '@lobster-world/protocol';

export interface SessionKeyState {
  sessionId: string;
  localKeyPair: CryptoKeyPair;
  remotePublicKey: Uint8Array | null;
  established: boolean;
}

export class E2EEncryptionManager {
  private sessions = new Map<string, SessionKeyState>();

  initiateKeyExchange(sessionId: string): KeyExchangeRequest {
    const localKeyPair = generateX25519KeyPair();
    this.sessions.set(sessionId, {
      sessionId,
      localKeyPair,
      remotePublicKey: null,
      established: false,
    });

    return {
      type: 'key_exchange_request',
      sessionId,
      publicKey: encodeBase64(localKeyPair.publicKey),
    };
  }

  handleKeyExchangeRequest(
    sessionId: string,
    remotePublicKeyBase64: string,
  ): KeyExchangeResponse {
    const localKeyPair = generateX25519KeyPair();
    const remotePublicKey = decodeBase64(remotePublicKeyBase64);

    this.sessions.set(sessionId, {
      sessionId,
      localKeyPair,
      remotePublicKey,
      established: true,
    });

    return {
      type: 'key_exchange_response',
      sessionId,
      publicKey: encodeBase64(localKeyPair.publicKey),
      accepted: true,
    };
  }

  handleKeyExchangeResponse(
    sessionId: string,
    remotePublicKeyBase64: string,
    accepted: boolean,
  ): boolean {
    if (!accepted) {
      this.sessions.delete(sessionId);
      return false;
    }

    const state = this.sessions.get(sessionId);
    if (!state) {
      return false;
    }

    state.remotePublicKey = decodeBase64(remotePublicKeyBase64);
    state.established = true;
    return true;
  }

  encryptMessage(sessionId: string, plaintext: string): EncryptedMessage {
    const state = this.sessions.get(sessionId);
    if (!state?.established || !state.remotePublicKey) {
      throw new Error(`No established E2E session for ${sessionId}`);
    }

    return encrypt(plaintext, state.remotePublicKey, state.localKeyPair.secretKey);
  }

  decryptMessage(sessionId: string, encrypted: EncryptedMessage): string {
    const state = this.sessions.get(sessionId);
    if (!state?.established || !state.remotePublicKey) {
      throw new Error(`No established E2E session for ${sessionId}`);
    }

    return decrypt(encrypted, state.remotePublicKey, state.localKeyPair.secretKey);
  }

  isEstablished(sessionId: string): boolean {
    const state = this.sessions.get(sessionId);
    return state?.established === true;
  }

  getPublicKey(sessionId: string): string | undefined {
    const state = this.sessions.get(sessionId);
    if (!state) return undefined;
    return encodeBase64(state.localKeyPair.publicKey);
  }

  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getActiveSessionIds(): string[] {
    return [...this.sessions.keys()].filter((id) => this.sessions.get(id)?.established);
  }
}
