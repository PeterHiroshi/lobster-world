/**
 * CommsEngine — PostgreSQL Integration Tests
 *
 * Mirrors the InMemory tests in comms.test.ts but runs against a real PG database.
 * Skipped when TEST_DATABASE_URL is not set.
 */
import { pgTestSuite } from '../helpers/pg-test-helpers.js';
import { CommsEngine } from '../../src/engine/comms.js';
import { PgCommsRepo } from '../../src/db/repositories/comms-repo.js';

pgTestSuite('CommsEngine (PostgreSQL)', ({ getDb }) => {
  let comms: CommsEngine;

  beforeEach(() => {
    comms = new CommsEngine(new PgCommsRepo(getDb()));
  });

  describe('sendMessage', () => {
    it('creates a direct message with correct fields', async () => {
      const msg = await comms.sendMessage('alice', 'bob', 'direct', 'hello');
      expect(msg.id).toBe('msg-1');
      expect(msg.from).toBe('alice');
      expect(msg.to).toBe('bob');
      expect(msg.type).toBe('direct');
      expect(msg.content).toBe('hello');
      expect(msg.timestamp).toBeTypeOf('number');
      expect(msg.context).toBeUndefined();
    });

    it('creates a message with context', async () => {
      const msg = await comms.sendMessage('alice', 'bob', 'direct', 'review this', {
        taskId: 'task-1',
        docId: 'doc-1',
      });
      expect(msg.context).toEqual({ taskId: 'task-1', docId: 'doc-1' });
    });

    it('increments message IDs', async () => {
      const m1 = await comms.sendMessage('alice', 'bob', 'direct', 'hi');
      const m2 = await comms.sendMessage('alice', 'bob', 'direct', 'hello');
      expect(m1.id).toBe('msg-1');
      expect(m2.id).toBe('msg-2');
    });
  });

  describe('getMessages', () => {
    it('returns messages for an agent (sent and received)', async () => {
      await comms.sendMessage('alice', 'bob', 'direct', 'hello bob');
      await comms.sendMessage('bob', 'alice', 'direct', 'hi alice');
      await comms.sendMessage('charlie', 'dave', 'direct', 'unrelated');

      const bobMessages = await comms.getMessages('bob');
      expect(bobMessages).toHaveLength(2); // received from alice + sent to alice
    });

    it('includes broadcast messages', async () => {
      await comms.broadcast('admin', 'announcement');
      const msgs = await comms.getMessages('anyone');
      expect(msgs).toHaveLength(1);
    });
  });

  describe('getMessagesByType', () => {
    it('filters by message type', async () => {
      await comms.sendMessage('alice', 'bob', 'direct', 'hey');
      await comms.broadcast('admin', 'news');
      await comms.sendMessage('alice', 'bob', 'direct', 'more');

      expect(await comms.getMessagesByType('direct')).toHaveLength(2);
      expect(await comms.getMessagesByType('broadcast')).toHaveLength(1);
    });
  });

  describe('getRecentMessages', () => {
    it('returns the N most recent messages', async () => {
      for (let i = 0; i < 5; i++) {
        await comms.sendMessage('alice', 'bob', 'direct', `msg ${i}`);
      }
      const recent = await comms.getRecentMessages(3);
      expect(recent).toHaveLength(3);
      expect(recent[0].content).toBe('msg 2');
      expect(recent[2].content).toBe('msg 4');
    });
  });

  describe('meetings', () => {
    it('creates a meeting', async () => {
      const meeting = await comms.createMeeting('Sprint Planning', ['alice', 'bob']);
      expect(meeting.id).toBe('meeting-1');
      expect(meeting.topic).toBe('Sprint Planning');
      expect(meeting.participants).toEqual(['alice', 'bob']);
      expect(meeting.messages).toEqual([]);
      expect(meeting.decisions).toEqual([]);
      expect(meeting.status).toBe('active');
    });

    it('adds a message to a meeting', async () => {
      const meeting = await comms.createMeeting('Review', ['alice']);
      const msg = await comms.addMeetingMessage(meeting.id, 'alice', 'Let us begin');
      expect(msg).toBeDefined();
      expect(msg?.from).toBe('alice');
      expect(msg?.content).toBe('Let us begin');
    });

    it('adds a decision to a meeting', async () => {
      const meeting = await comms.createMeeting('Review', ['alice']);
      expect(await comms.addDecision(meeting.id, 'Use PostgreSQL')).toBe(true);
      const updated = await comms.getMeeting(meeting.id);
      expect(updated?.decisions).toContain('Use PostgreSQL');
    });

    it('ends a meeting', async () => {
      const meeting = await comms.createMeeting('Review', ['alice']);
      const ended = await comms.endMeeting(meeting.id);
      expect(ended?.status).toBe('ended');
    });

    it('rejects messages to ended meetings', async () => {
      const meeting = await comms.createMeeting('Review', ['alice']);
      await comms.endMeeting(meeting.id);
      expect(await comms.addMeetingMessage(meeting.id, 'alice', 'Late')).toBeUndefined();
    });

    it('rejects decisions for ended meetings', async () => {
      const meeting = await comms.createMeeting('Review', ['alice']);
      await comms.endMeeting(meeting.id);
      expect(await comms.addDecision(meeting.id, 'Too late')).toBe(false);
    });

    it('gets active meetings', async () => {
      await comms.createMeeting('Active 1', ['alice']);
      const m2 = await comms.createMeeting('Active 2', ['bob']);
      await comms.endMeeting(m2.id);
      await comms.createMeeting('Active 3', ['charlie']);

      expect(await comms.getActiveMeetings()).toHaveLength(2);
    });
  });

  describe('counts', () => {
    it('tracks message count', async () => {
      expect(await comms.getMessageCount()).toBe(0);
      await comms.sendMessage('alice', 'bob', 'direct', 'hello');
      expect(await comms.getMessageCount()).toBe(1);
    });

    it('tracks meeting count', async () => {
      expect(await comms.getMeetingCount()).toBe(0);
      await comms.createMeeting('Test', ['alice']);
      expect(await comms.getMeetingCount()).toBe(1);
    });
  });
});
