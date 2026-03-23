import { describe, it, expect, beforeEach } from 'vitest';
import { KeyStore } from '../src/engine/key-store.js';

describe('KeyStore', () => {
  let store: KeyStore;

  beforeEach(() => {
    store = new KeyStore();
  });

  it('stores and retrieves a public key', () => {
    const record = store.store('lobster-a', 'base64-public-key-a');
    expect(record.lobsterId).toBe('lobster-a');
    expect(record.x25519PublicKey).toBe('base64-public-key-a');
    expect(record.updatedAt).toBeGreaterThan(0);

    const retrieved = store.get('lobster-a');
    expect(retrieved).toEqual(record);
  });

  it('returns undefined for unknown lobster', () => {
    expect(store.get('unknown')).toBeUndefined();
  });

  it('overwrites an existing key', () => {
    store.store('lobster-a', 'key-v1');
    const updated = store.store('lobster-a', 'key-v2');
    expect(updated.x25519PublicKey).toBe('key-v2');
    expect(store.get('lobster-a')?.x25519PublicKey).toBe('key-v2');
    expect(store.size()).toBe(1);
  });

  it('returns all keys', () => {
    store.store('a', 'key-a');
    store.store('b', 'key-b');
    const all = store.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.lobsterId).sort()).toEqual(['a', 'b']);
  });

  it('removes a key', () => {
    store.store('a', 'key-a');
    expect(store.remove('a')).toBe(true);
    expect(store.get('a')).toBeUndefined();
    expect(store.size()).toBe(0);
  });

  it('returns false when removing non-existent key', () => {
    expect(store.remove('unknown')).toBe(false);
  });

  it('reports correct size', () => {
    expect(store.size()).toBe(0);
    store.store('a', 'key-a');
    expect(store.size()).toBe(1);
    store.store('b', 'key-b');
    expect(store.size()).toBe(2);
  });
});
