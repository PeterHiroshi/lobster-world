/**
 * KeyStore — PostgreSQL Integration Tests
 *
 * Mirrors the InMemory tests in key-store.test.ts but runs against a real PG database.
 * Skipped when TEST_DATABASE_URL is not set.
 */
import { pgTestSuite } from '../helpers/pg-test-helpers.js';
import { KeyStore } from '../../src/engine/key-store.js';
import { PgKeyStoreRepo } from '../../src/db/repositories/key-store-repo.js';

pgTestSuite('KeyStore (PostgreSQL)', ({ getDb }) => {
  let store: KeyStore;

  beforeEach(() => {
    store = new KeyStore(new PgKeyStoreRepo(getDb()));
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

  it('lists all keys', async () => {
    await store.store('lobster-a', 'key-a');
    await store.store('lobster-b', 'key-b');
    const all = await store.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.lobsterId).sort()).toEqual(['lobster-a', 'lobster-b']);
  });

  it('removes a key', async () => {
    await store.store('lobster-a', 'key-a');
    expect(await store.remove('lobster-a')).toBe(true);
    expect(await store.get('lobster-a')).toBeUndefined();
    expect(await store.size()).toBe(0);
  });

  it('returns false when removing non-existent key', async () => {
    expect(await store.remove('unknown')).toBe(false);
  });

  it('tracks size correctly', async () => {
    expect(await store.size()).toBe(0);
    await store.store('a', 'key-a');
    await store.store('b', 'key-b');
    expect(await store.size()).toBe(2);
    await store.remove('a');
    expect(await store.size()).toBe(1);
  });
});
