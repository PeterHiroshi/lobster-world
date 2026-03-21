import { describe, it, expect, beforeEach } from 'vitest';
import { CommsEngine } from '../src/engine/comms.js';

describe('CommsEngine', () => {
  let comms: CommsEngine;

  beforeEach(() => {
    comms = new CommsEngine();
  });

  describe('sendMessage', () => {
    it('creates a direct message with correct fields', () => {
      const msg = comms.sendMessage('alice', 'bob', 'direct', 'hello');
      expect(msg.id).toBe('msg-1');
      expect(msg.from).toBe('alice');
      expect(msg.to).toBe('bob');
      expect(msg.type).toBe('direct');
      expect(msg.content).toBe('hello');
      expect(msg.timestamp).toBeTypeOf('number');
      expect(msg.context).toBeUndefined();
    });

    it('creates a message with context', () => {
      const msg = comms.sendMessage('alice', 'bob', 'direct', 'review this', {
        taskId: 'task-1',
        docId: 'doc-1',
      });
      expect(msg.context).toEqual({ taskId: 'task-1', docId: 'doc-1' });
    });

    it('increments message IDs', () => {
      const m1 = comms.sendMessage('a', 'b', 'direct', 'first');
      const m2 = comms.sendMessage('a', 'b', 'direct', 'second');
      expect(m1.id).toBe('msg-1');
      expect(m2.id).toBe('msg-2');
    });
  });

  describe('getMessages', () => {
    it('returns messages sent to the agent', () => {
      comms.sendMessage('alice', 'bob', 'direct', 'hi bob');
      comms.sendMessage('alice', 'charlie', 'direct', 'hi charlie');
      const msgs = comms.getMessages('bob');
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe('hi bob');
    });

    it('returns messages sent by the agent', () => {
      comms.sendMessage('bob', 'alice', 'direct', 'from bob');
      const msgs = comms.getMessages('bob');
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe('from bob');
    });

    it('includes broadcast messages', () => {
      comms.sendMessage('alice', 'all', 'broadcast', 'hey everyone');
      const msgs = comms.getMessages('bob');
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe('hey everyone');
    });

    it('includes sent, received, and broadcast messages together', () => {
      comms.sendMessage('bob', 'alice', 'direct', 'sent');
      comms.sendMessage('alice', 'bob', 'direct', 'received');
      comms.sendMessage('alice', 'all', 'broadcast', 'broadcast');
      comms.sendMessage('alice', 'charlie', 'direct', 'other');
      const msgs = comms.getMessages('bob');
      expect(msgs).toHaveLength(3);
    });
  });

  describe('getMessagesByType', () => {
    it('filters messages by type', () => {
      comms.sendMessage('a', 'b', 'direct', 'dm');
      comms.sendMessage('a', 'all', 'broadcast', 'bc');
      comms.sendMessage('a', 'b', 'review', 'rv');
      expect(comms.getMessagesByType('direct')).toHaveLength(1);
      expect(comms.getMessagesByType('broadcast')).toHaveLength(1);
      expect(comms.getMessagesByType('review')).toHaveLength(1);
      expect(comms.getMessagesByType('async')).toHaveLength(0);
    });
  });

  describe('getRecentMessages', () => {
    it('returns the last N messages', () => {
      comms.sendMessage('a', 'b', 'direct', 'first');
      comms.sendMessage('a', 'b', 'direct', 'second');
      comms.sendMessage('a', 'b', 'direct', 'third');
      const recent = comms.getRecentMessages(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].content).toBe('second');
      expect(recent[1].content).toBe('third');
    });

    it('returns all messages if count exceeds total', () => {
      comms.sendMessage('a', 'b', 'direct', 'only');
      expect(comms.getRecentMessages(10)).toHaveLength(1);
    });
  });

  describe('createMeeting', () => {
    it('creates a meeting with correct defaults', () => {
      const meeting = comms.createMeeting('standup', ['alice', 'bob']);
      expect(meeting.id).toBe('meeting-1');
      expect(meeting.topic).toBe('standup');
      expect(meeting.participants).toEqual(['alice', 'bob']);
      expect(meeting.messages).toEqual([]);
      expect(meeting.decisions).toEqual([]);
      expect(meeting.status).toBe('active');
    });

    it('increments meeting IDs', () => {
      const m1 = comms.createMeeting('a', []);
      const m2 = comms.createMeeting('b', []);
      expect(m1.id).toBe('meeting-1');
      expect(m2.id).toBe('meeting-2');
    });
  });

  describe('addMeetingMessage', () => {
    it('adds a message to the meeting', () => {
      const meeting = comms.createMeeting('standup', ['alice', 'bob']);
      const msg = comms.addMeetingMessage(meeting.id, 'alice', 'hello');
      expect(msg).toBeDefined();
      expect(msg!.type).toBe('meeting');
      expect(msg!.from).toBe('alice');
      expect(msg!.content).toBe('hello');
      expect(meeting.messages).toHaveLength(1);
    });

    it('returns undefined for non-existent meeting', () => {
      expect(comms.addMeetingMessage('nope', 'a', 'hi')).toBeUndefined();
    });

    it('returns undefined for ended meeting', () => {
      const meeting = comms.createMeeting('done', ['a']);
      comms.endMeeting(meeting.id);
      expect(comms.addMeetingMessage(meeting.id, 'a', 'hi')).toBeUndefined();
    });
  });

  describe('addDecision', () => {
    it('adds a decision to the meeting', () => {
      const meeting = comms.createMeeting('topic', ['a']);
      expect(comms.addDecision(meeting.id, 'we decided X')).toBe(true);
      expect(meeting.decisions).toEqual(['we decided X']);
    });

    it('returns false for non-existent meeting', () => {
      expect(comms.addDecision('nope', 'decision')).toBe(false);
    });

    it('returns false for ended meeting', () => {
      const meeting = comms.createMeeting('topic', ['a']);
      comms.endMeeting(meeting.id);
      expect(comms.addDecision(meeting.id, 'too late')).toBe(false);
    });
  });

  describe('endMeeting', () => {
    it('sets meeting status to ended', () => {
      const meeting = comms.createMeeting('topic', ['a']);
      const ended = comms.endMeeting(meeting.id);
      expect(ended).toBeDefined();
      expect(ended!.status).toBe('ended');
    });

    it('returns undefined for non-existent meeting', () => {
      expect(comms.endMeeting('nope')).toBeUndefined();
    });
  });

  describe('getMeeting', () => {
    it('returns meeting by ID', () => {
      const meeting = comms.createMeeting('topic', ['a']);
      expect(comms.getMeeting(meeting.id)).toBe(meeting);
    });

    it('returns undefined for unknown ID', () => {
      expect(comms.getMeeting('nope')).toBeUndefined();
    });
  });

  describe('getActiveMeetings', () => {
    it('returns only active meetings', () => {
      const m1 = comms.createMeeting('a', ['x']);
      const m2 = comms.createMeeting('b', ['x']);
      comms.endMeeting(m1.id);
      const active = comms.getActiveMeetings();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(m2.id);
    });
  });

  describe('broadcast', () => {
    it('creates a message with to=all and type=broadcast', () => {
      const msg = comms.broadcast('alice', 'announcement');
      expect(msg.to).toBe('all');
      expect(msg.type).toBe('broadcast');
      expect(msg.from).toBe('alice');
      expect(msg.content).toBe('announcement');
    });
  });

  describe('counts', () => {
    it('tracks message count', () => {
      expect(comms.getMessageCount()).toBe(0);
      comms.sendMessage('a', 'b', 'direct', 'hi');
      comms.sendMessage('a', 'b', 'direct', 'hi2');
      expect(comms.getMessageCount()).toBe(2);
    });

    it('tracks meeting count', () => {
      expect(comms.getMeetingCount()).toBe(0);
      comms.createMeeting('a', []);
      comms.createMeeting('b', []);
      expect(comms.getMeetingCount()).toBe(2);
    });

    it('meeting messages are included in global message count', () => {
      const meeting = comms.createMeeting('topic', ['a']);
      comms.addMeetingMessage(meeting.id, 'a', 'in meeting');
      comms.sendMessage('a', 'b', 'direct', 'outside');
      expect(comms.getMessageCount()).toBe(2);
    });
  });
});
