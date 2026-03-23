import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorldStore } from '../src/store/useWorldStore';
import type { RenderEvent } from '@lobster-world/protocol';

vi.mock('../src/lib/audio', () => ({
  playChatPing: vi.fn(),
  playJoinSound: vi.fn(),
  playTypingClick: vi.fn(),
  setMuted: vi.fn(),
  getMuted: () => true,
}));

describe('Encrypted dialogue store handling', () => {
  beforeEach(() => {
    useWorldStore.setState({
      lobsters: {},
      dialogues: [],
      activeDialogues: {},
      lobsterStats: {},
      stats: { lobsterCount: 0, realLobsterCount: 0, demoLobsterCount: 0, activeDialogues: 0, totalMessages: 0 },
    });
  });

  function startDialogue(sessionId: string): void {
    const event: RenderEvent = {
      type: 'dialogue_start',
      sessionId,
      participants: ['alice', 'bob'],
      participantNames: ['Alice', 'Bob'],
      participantColors: ['#ff0000', '#0000ff'],
      intent: 'test',
    };
    useWorldStore.getState().handleRenderEvent(event);
  }

  describe('dialogue_encrypted', () => {
    it('marks an active dialogue as encrypted', () => {
      startDialogue('session-1');
      expect(useWorldStore.getState().activeDialogues['session-1'].encrypted).toBeUndefined();

      const event: RenderEvent = {
        type: 'dialogue_encrypted',
        sessionId: 'session-1',
        participants: ['alice', 'bob'],
      };
      useWorldStore.getState().handleRenderEvent(event);

      expect(useWorldStore.getState().activeDialogues['session-1'].encrypted).toBe(true);
    });

    it('does not crash for unknown session', () => {
      const event: RenderEvent = {
        type: 'dialogue_encrypted',
        sessionId: 'nonexistent',
        participants: ['a', 'b'],
      };
      useWorldStore.getState().handleRenderEvent(event);
      expect(useWorldStore.getState().activeDialogues['nonexistent']).toBeUndefined();
    });
  });

  describe('encrypted_dialogue_msg', () => {
    it('adds an encrypted message to the dialogue', () => {
      startDialogue('session-1');

      const event: RenderEvent = {
        type: 'encrypted_dialogue_msg',
        sessionId: 'session-1',
        fromId: 'alice',
        fromName: 'Alice',
        fromColor: '#ff0000',
        turnNumber: 1,
      };
      useWorldStore.getState().handleRenderEvent(event);

      const dialogue = useWorldStore.getState().activeDialogues['session-1'];
      expect(dialogue.messages).toHaveLength(1);
      expect(dialogue.messages[0].encrypted).toBe(true);
      expect(dialogue.messages[0].content).toBe('[Encrypted message]');
      expect(dialogue.messages[0].fromName).toBe('Alice');
      expect(dialogue.messages[0].turnNumber).toBe(1);
    });

    it('increments lobster message stats', () => {
      startDialogue('session-1');

      const event: RenderEvent = {
        type: 'encrypted_dialogue_msg',
        sessionId: 'session-1',
        fromId: 'alice',
        fromName: 'Alice',
        fromColor: '#ff0000',
        turnNumber: 1,
      };
      useWorldStore.getState().handleRenderEvent(event);

      expect(useWorldStore.getState().lobsterStats['alice'].messagesSent).toBe(1);
    });

    it('does not crash for unknown session', () => {
      const event: RenderEvent = {
        type: 'encrypted_dialogue_msg',
        sessionId: 'nonexistent',
        fromId: 'alice',
        fromName: 'Alice',
        fromColor: '#ff0000',
        turnNumber: 1,
      };
      useWorldStore.getState().handleRenderEvent(event);
      expect(useWorldStore.getState().activeDialogues['nonexistent']).toBeUndefined();
    });

    it('accumulates encrypted messages in order', () => {
      startDialogue('session-1');

      for (let i = 1; i <= 3; i++) {
        const event: RenderEvent = {
          type: 'encrypted_dialogue_msg',
          sessionId: 'session-1',
          fromId: i % 2 === 1 ? 'alice' : 'bob',
          fromName: i % 2 === 1 ? 'Alice' : 'Bob',
          fromColor: i % 2 === 1 ? '#ff0000' : '#0000ff',
          turnNumber: i,
        };
        useWorldStore.getState().handleRenderEvent(event);
      }

      const dialogue = useWorldStore.getState().activeDialogues['session-1'];
      expect(dialogue.messages).toHaveLength(3);
      expect(dialogue.messages.every((m) => m.encrypted)).toBe(true);
    });
  });
});
