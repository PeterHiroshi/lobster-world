import type { AuthChallenge, AuthResponse } from '@lobster-world/protocol';
import nacl from 'tweetnacl';
import crypto from 'node:crypto';

export interface AuthResult {
  valid: boolean;
  reason?: string;
}

function fromHex(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export class AuthManager {
  private publicKeys = new Map<string, string>(); // lobsterId -> publicKey hex
  private mockTokens = new Map<string, string>(); // lobsterId -> token
  private sessionTokens = new Map<string, string>(); // token -> lobsterId

  createChallenge(): AuthChallenge {
    return {
      nonce: crypto.randomBytes(32).toString('hex'),
      timestamp: Date.now(),
    };
  }

  registerPublicKey(lobsterId: string, publicKeyHex: string): void {
    this.publicKeys.set(lobsterId, publicKeyHex);
  }

  hasPublicKey(lobsterId: string): boolean {
    return this.publicKeys.has(lobsterId);
  }

  verifyAuthResponse(response: AuthResponse, nonce: string): AuthResult {
    const publicKeyBytes = fromHex(response.publicKey);
    if (!publicKeyBytes || publicKeyBytes.length !== 32) {
      return { valid: false, reason: 'Invalid public key format' };
    }

    const signatureBytes = fromHex(response.signature);
    if (!signatureBytes || signatureBytes.length !== 64) {
      return { valid: false, reason: 'Invalid signature format' };
    }

    const message = new TextEncoder().encode(nonce);
    const valid = nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);

    if (!valid) {
      return { valid: false, reason: 'Invalid signature' };
    }

    // If lobster has a registered key, verify it matches
    const registeredKey = this.publicKeys.get(response.lobsterId);
    if (registeredKey && registeredKey !== response.publicKey) {
      return { valid: false, reason: 'Public key mismatch' };
    }

    // Auto-register on first successful auth
    if (!registeredKey) {
      this.publicKeys.set(response.lobsterId, response.publicKey);
    }

    return { valid: true };
  }

  registerMockToken(lobsterId: string, token: string): void {
    this.mockTokens.set(lobsterId, token);
  }

  verifyMockToken(lobsterId: string, token: string): boolean {
    return this.mockTokens.get(lobsterId) === token;
  }

  createSessionToken(lobsterId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.sessionTokens.set(token, lobsterId);
    return token;
  }

  validateSessionToken(token: string): string | null {
    return this.sessionTokens.get(token) ?? null;
  }

  revokeSessionToken(token: string): void {
    this.sessionTokens.delete(token);
  }
}
