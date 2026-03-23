import type { PublicKeyRecord } from '@lobster-world/protocol';

export class KeyStore {
  private keys = new Map<string, PublicKeyRecord>();

  store(lobsterId: string, x25519PublicKey: string): PublicKeyRecord {
    const record: PublicKeyRecord = {
      lobsterId,
      x25519PublicKey,
      updatedAt: Date.now(),
    };
    this.keys.set(lobsterId, record);
    return record;
  }

  get(lobsterId: string): PublicKeyRecord | undefined {
    return this.keys.get(lobsterId);
  }

  getAll(): PublicKeyRecord[] {
    return [...this.keys.values()];
  }

  remove(lobsterId: string): boolean {
    return this.keys.delete(lobsterId);
  }

  size(): number {
    return this.keys.size;
  }
}
