import { describe, it, expect, beforeEach } from 'vitest';
import { CommsEngine } from '../src/engine/comms.js';

describe('CommsEngine', () => {
  let comms: CommsEngine;

  beforeEach(() => {
    comms = new CommsEngine();
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
      const m1 = await comms.sendMessage('a', 'b', 'direct', 'first');
      const m2 = await comms.sendMessage('a', 'b', 'direct', 'second');
      expect(m1.id).toBe('msg-1');
      expect(m2.id).toBe('msg-2');
    });
  });

  describe('getMessages', () => {
    it('returns messages sent to the agent', async () => {
      await comms.sendMessage('alice', 'bob', 'direct', 'hi bob');
      await comms.sendMessage('alice', 'charlie', 'direct', 'hi charlie');
      const msgs = await comms.getMessages('bob');
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe('hi bob');
    });

    it('returns messages sent by the agent', async () => {
      await comms.sendMessage('bob', 'alice', 'direct', 'from bob');
      const msgs = await comms.getMessages('bob');
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe('from bob');
    });

    it('includes broadcast messages', async () => {
      await comms.sendMessage('alice', 'all', 'broadcast', 'hey everyone');
      const msgs = await comms.getMessages('bob');
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe('hey everyone');
    });

    it('includes sent, received, and broadcast messages together', async () => {
      await comms.sendMessage('bob', 'alice', 'direct', 'sent');
      await comms.sendMessage('alice', 'bob', 'direct', 'received');
      await comms.sendMessage('alice', 'all', 'broadcast', 'broadcast');
      await comms.sendMessage('alice', 'charlie', 'direct', 'other');
      const msgs = await comms.getMessages('bob');
      expect(msgs).toHaveLength(3);
    });
  });

  describe('getMessagesByType', () => {
    it('filters messages by type', async () => {
      await comms.sendMessage('a', 'b', 'direct', 'dm');
      await comms.sendMessage('a', 'all', 'broadcast', 'bc');
      await comms.sendMessage('a', 'b', 'review', 'rv');
      expect(await comms.getMessagesByType('direct')).toHaveLength(1);
      expect(await comms.getMessagesByType('broadcast')).toHaveLength(1);
      expect(await comms.getMessagesByType('review')).toHaveLength(1);
      expect(await comms.getMessagesByType('async')).toHaveLength(0);
    });
  });

  describe('getRecentMessages', () => {
    it('returns the last N messages', async () => {
      await comms.sendMessage('a', 'b', 'direct', 'first');
      await comms.sendMessage('a', 'b', 'direct', 'second');
      await comms.sendMessage('a', 'b', 'direct', 'third');
      const recent = await comms.getRecentMessages(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].content).toBe('second');
      expect(recent[1].content).toBe('third');
    });

    it('returns all messages if count exceeds total', async () => {
      await comms.sendMessage('a', 'b', 'direct', 'only');
      expect(await comms.getRecentMessages(10)).toHaveLength(1);
    });
  });

  describe('createMeeting', () => {
    it('creates a meeting with correct defaults', async () => {
      const meeting = await comms.createMeeting('standup', ['alice', 'bob']);
      expect(meeting.id).toBe('meeting-1');
      expect(meeting.topic).toBe('standup');
      expect(meeting.participants).toEqual(['alice', 'bob']);
      expect(meeting.messages).toEqual([]);
      expect(meeting.decisions).toEqual([]);
      expect(meeting.status).toBe('active');
    });

    it('increments meeting IDs', async () => {
      const m1 = await comms.createMeeting('a', []);
      const m2 = await comms.createMeeting('b', []);
      expect(m1.id).toBe('meeting-1');
      expect(m2.id).toBe('meeting-2');
    });
  });

  describe('addMeetingMessage', () => {
    it('adds a message to the meeting', async () => {
      const meeting = await comms.createMeeting('standup', ['alice', 'bob']);
      const msg = await comms.addMeetingMessage(meeting.id, 'alice', 'hello');
      expect(msg).toBeDefined();
      expect(msg!.type).toBe('meeting');
      expect(msg!.from).toBe('alice');
      expect(msg!.content).toBe('hello');
      expect(meeting.messages).toHaveLength(1);
    });

    it('returns undefined for non-existent meeting', async () => {
      expect(await comms.addMeetingMessage('nope', 'a', 'hi')).toBeUndefined();
    });

    it('returns undefined for ended meeting', async () => {
      const meeting = await comms.createMeeting('done', ['a']);
      await comms.endMeeting(meeting.id);
      expect(await comms.addMeetingMessage(meeting.id, 'a', 'hi')).toBeUndefined();
    });
  });

  describe('addDecision', () => {
    it('adds a decision to the meeting', async () => {
      const meeting = await comms.createMeeting('topic', ['a']);
      expect(await comms.addDecision(meeting.id, 'we decided X')).toBe(true);
      expect(meeting.decisions).toEqual(['we decided X']);
    });

    it('returns false for non-existent meeting', async () => {
      expect(await comms.addDecision('nope', 'decision')).toBe(false);
    });

    it('returns false for ended meeting', async () => {
      const meeting = await comms.createMeeting('topic', ['a']);
      await comms.endMeeting(meeting.id);
      expect(await comms.addDecision(meeting.id, 'too late')).toBe(false);
    });
  });

  describe('endMeeting', () => {
    it('sets meeting status to ended', async () => {
      const meeting = await comms.createMeeting('topic', ['a']);
      const ended = await comms.endMeeting(meeting.id);
      expect(ended).toBeDefined();
      expect(ended!.status).toBe('ended');
    });

    it('returns undefined for non-existent meeting', async () => {
      expect(await comms.endMeeting('nope')).toBeUndefined();
    });
  });

  describe('getMeeting', () => {
    it('returns meeting by ID', async () => {
      const meeting = await comms.createMeeting('topic', ['a']);
      expect(await comms.getMeeting(meeting.id)).toBe(meeting);
    });

    it('returns undefined for unknown ID', async () => {
      expect(await comms.getMeeting('nope')).toBeUndefined();
    });
  });

  describe('getActiveMeetings', () => {
    it('returns only active meetings', async () => {
      const m1 = await comms.createMeeting('a', ['x']);
      const m2 = await comms.createMeeting('b', ['x']);
      await comms.endMeeting(m1.id);
      const active = await comms.getActiveMeetings();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(m2.id);
    });
  });

  describe('broadcast', () => {
    it('creates a message with to=all and type=broadcast', async () => {
      const msg = await comms.broadcast('alice', 'announcement');
      expect(msg.to).toBe('all');
      expect(msg.type).toBe('broadcast');
      expect(msg.from).toBe('alice');
      expect(msg.content).toBe('announcement');
    });
  });

  describe('counts', () => {
    it('tracks message count', async () => {
      expect(await comms.getMessageCount()).toBe(0);
      await comms.sendMessage('a', 'b', 'direct', 'hi');
      await comms.sendMessage('a', 'b', 'direct', 'hi2');
      expect(await comms.getMessageCount()).toBe(2);
    });

    it('tracks meeting count', async () => {
      expect(await comms.getMeetingCount()).toBe(0);
      await comms.createMeeting('a', []);
      await comms.createMeeting('b', []);
      expect(await comms.getMeetingCount()).toBe(2);
    });

    it('meeting messages are included in global message count', async () => {
      const meeting = await comms.createMeeting('topic', ['a']);
      await comms.addMeetingMessage(meeting.id, 'a', 'in meeting');
      await comms.sendMessage('a', 'b', 'direct', 'outside');
      expect(await comms.getMessageCount()).toBe(2);
    });
  });
});
