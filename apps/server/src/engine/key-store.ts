import type { PublicKeyRecord } from '@lobster-world/protocol';
import type { KeyStoreRepository } from '../db/repositories/key-store-repo.js';
import { InMemoryKeyStoreRepo } from '../db/repositories/key-store-repo.js';

export class KeyStore {
  private repo: KeyStoreRepository;

  constructor(repo?: KeyStoreRepository) {
    this.repo = repo ?? new InMemoryKeyStoreRepo();
  }

  store(lobsterId: string, x25519PublicKey: string): Promise<PublicKeyRecord> {
    return this.repo.store(lobsterId, x25519PublicKey);
  }

  get(lobsterId: string): Promise<PublicKeyRecord | undefined> {
    return this.repo.get(lobsterId);
  }

  getAll(): Promise<PublicKeyRecord[]> {
    return this.repo.getAll();
  }

  remove(lobsterId: string): Promise<boolean> {
    return this.repo.remove(lobsterId);
  }

  size(): Promise<number> {
    return this.repo.size();
  }
}
