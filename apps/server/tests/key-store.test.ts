import { describe, it, expect, beforeEach } from 'vitest';
import { KeyStore } from '../src/engine/key-store.js';

describe('KeyStore', () => {
  let store: KeyStore;

  beforeEach(() => {
    store = new KeyStore();
  });

  it('stores and retrieves a public key', async () => {
    const record = await store.store('lobster-a', 'base64-public-key-a');
    expect(record.lobsterId).toBe('lobster-a');
    expect(record.x25519PublicKey).toBe('base64-public-key-a');
    expect(record.updatedAt).toBeGreaterThan(0);

    const retrieved = await store.get('lobster-a');
    expect(retrieved).toEqual(record);
  });

  it('returns undefined for unknown lobster', async () => {
    expect(await store.get('unknown')).toBeUndefined();
  });

  it('overwrites an existing key', async () => {
    await store.store('lobster-a', 'key-v1');
    const updated = await store.store('lobster-a', 'key-v2');
    expect(updated.x25519PublicKey).toBe('key-v2');
    expect((await store.get('lobster-a'))?.x25519PublicKey).toBe('key-v2');
    expect(await store.size()).toBe(1);
  });

  it('returns all keys', async () => {
    await store.store('a', 'key-a');
    await store.store('b', 'key-b');
    const all = await store.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.lobsterId).sort()).toEqual(['a', 'b']);
  });

  it('removes a key', async () => {
    await store.store('a', 'key-a');
    expect(await store.remove('a')).toBe(true);
    expect(await store.get('a')).toBeUndefined();
    expect(await store.size()).toBe(0);
  });

  it('returns false when removing non-existent key', async () => {
    expect(await store.remove('unknown')).toBe(false);
  });

  it('reports correct size', async () => {
    expect(await store.size()).toBe(0);
    await store.store('a', 'key-a');
    expect(await store.size()).toBe(1);
    await store.store('b', 'key-b');
    expect(await store.size()).toBe(2);
  });
});
