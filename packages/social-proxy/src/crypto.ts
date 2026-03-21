import nacl from 'tweetnacl';

export interface Keypair {
  publicKey: string; // hex-encoded 32 bytes
  secretKey: string; // hex-encoded 64 bytes
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

export class CryptoManager {
  generateKeypair(): Keypair {
    const kp = nacl.sign.keyPair();
    return {
      publicKey: toHex(kp.publicKey),
      secretKey: toHex(kp.secretKey),
    };
  }

  signNonce(nonce: string, secretKeyHex: string): string {
    const secretKey = fromHex(secretKeyHex);
    if (!secretKey || secretKey.length !== 64) {
      throw new Error('Invalid secret key');
    }
    const message = new TextEncoder().encode(nonce);
    const signature = nacl.sign.detached(message, secretKey);
    return toHex(signature);
  }

  verifySignature(nonce: string, signatureHex: string, publicKeyHex: string): boolean {
    const signature = fromHex(signatureHex);
    const publicKey = fromHex(publicKeyHex);
    if (!signature || signature.length !== 64 || !publicKey || publicKey.length !== 32) {
      return false;
    }
    const message = new TextEncoder().encode(nonce);
    return nacl.sign.detached.verify(message, signature, publicKey);
  }
}
