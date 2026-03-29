/**
 * AuditLog — PostgreSQL Integration Tests
 *
 * Mirrors the InMemory tests in audit-log.test.ts but runs against a real PG database.
 * Note: PgAuditRepo doesn't implement ring buffer behavior — it stores all events.
 * Tests are adapted accordingly.
 * Skipped when TEST_DATABASE_URL is not set.
 */
import { pgTestSuite } from '../helpers/pg-test-helpers.js';
import { AuditLog } from '../../src/engine/audit-log.js';
import { PgAuditRepo } from '../../src/db/repositories/audit-repo.js';

pgTestSuite('AuditLog (PostgreSQL)', ({ getDb }) => {
  let log: AuditLog;

  beforeEach(() => {
    log = new AuditLog(new PgAuditRepo(getDb()));
  });

  it('starts empty', async () => {
    expect(await log.getSize()).toBe(0);
    expect(await log.getAll()).toEqual([]);
  });

  it('logs events and retrieves them', async () => {
    await log.log('lobster_join', ['id1'], 'Cody joined');
    expect(await log.getSize()).toBe(1);

    const events = await log.getAll();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('lobster_join');
    expect(events[0].participants).toEqual(['id1']);
    expect(events[0].details).toBe('Cody joined');
    expect(events[0].timestamp).toBeGreaterThan(0);
  });

  it('returns newest first', async () => {
    await log.log('lobster_join', ['id1'], 'first');
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 5));
    await log.log('lobster_leave', ['id2'], 'second');
    await new Promise((r) => setTimeout(r, 5));
    await log.log('dialogue_start', ['id3'], 'third');

    const events = await log.getAll();
    expect(events[0].details).toBe('third');
    expect(events[1].details).toBe('second');
    expect(events[2].details).toBe('first');
  });

  it('getRecent limits count', async () => {
    for (let i = 0; i < 5; i++) {
      await log.log('dialogue_message', [`id${i}`], `msg ${i}`);
      await new Promise((r) => setTimeout(r, 2));
    }

    const recent = await log.getRecent(3);
    expect(recent).toHaveLength(3);
    expect(recent[0].details).toBe('msg 4');
    expect(recent[1].details).toBe('msg 3');
    expect(recent[2].details).toBe('msg 2');
  });

  it('clear resets the log', async () => {
    await log.log('lobster_join', ['id1'], 'test');
    await log.log('lobster_join', ['id2'], 'test2');
    expect(await log.getSize()).toBe(2);

    await log.clear();
    expect(await log.getSize()).toBe(0);
    expect(await log.getAll()).toEqual([]);
  });

  it('getRecent returns fewer than requested if fewer exist', async () => {
    await log.log('lobster_join', ['id1'], 'only one');
    const events = await log.getRecent(50);
    expect(events).toHaveLength(1);
  });

  it('stores multiple participants', async () => {
    await log.log('dialogue_start', ['id1', 'id2'], 'conversation started');
    const events = await log.getAll();
    expect(events[0].participants).toEqual(['id1', 'id2']);
  });

  it('handles many events without data loss (no ring buffer in PG)', async () => {
    for (let i = 0; i < 50; i++) {
      await log.log('dialogue_message', ['id'], `msg ${i}`);
    }
    // PG stores all events — no ring buffer truncation
    expect(await log.getSize()).toBe(50);
  });
});
