import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLog } from '../src/engine/audit-log.js';

describe('AuditLog', () => {
  let log: AuditLog;

  beforeEach(() => {
    log = new AuditLog(10); // Small buffer for testing overflow
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
    await log.log('lobster_leave', ['id2'], 'second');
    await log.log('dialogue_start', ['id3'], 'third');

    const events = await log.getAll();
    expect(events[0].details).toBe('third');
    expect(events[1].details).toBe('second');
    expect(events[2].details).toBe('first');
  });

  it('getRecent limits count', async () => {
    for (let i = 0; i < 5; i++) {
      await log.log('dialogue_message', [`id${i}`], `msg ${i}`);
    }

    const recent = await log.getRecent(3);
    expect(recent).toHaveLength(3);
    expect(recent[0].details).toBe('msg 4');
    expect(recent[1].details).toBe('msg 3');
    expect(recent[2].details).toBe('msg 2');
  });

  it('handles ring buffer overflow', async () => {
    // Buffer size is 10, write 15 events
    for (let i = 0; i < 15; i++) {
      await log.log('dialogue_message', [`id${i}`], `msg ${i}`);
    }

    expect(await log.getSize()).toBe(10);
    const events = await log.getAll();
    expect(events).toHaveLength(10);
    // Should have msgs 5-14 (oldest 0-4 overwritten)
    expect(events[0].details).toBe('msg 14');
    expect(events[9].details).toBe('msg 5');
  });

  it('clear resets the buffer', async () => {
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

  it('uses default capacity of 1000 when not specified', async () => {
    const defaultLog = new AuditLog();
    // Log 1001 events
    for (let i = 0; i < 1001; i++) {
      await defaultLog.log('dialogue_message', ['id'], `msg ${i}`);
    }
    expect(await defaultLog.getSize()).toBe(1000);
    const events = await defaultLog.getAll();
    expect(events[0].details).toBe('msg 1000');
    expect(events[999].details).toBe('msg 1');
  });
});
