import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventMapper } from '../src/events.js';
import { STATE_DEBOUNCE_MS } from '../src/constants.js';

describe('EventMapper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('agent state to lobster mapping', () => {
    it('maps coding activity to working animation', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentActivity('coding');
      expect(result.animation).toBe('working');
      expect(result.status).toBe('busy');
      expect(result.mood).toBe('focused');
    });

    it('maps chatting activity to chatting animation', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentActivity('chatting');
      expect(result.animation).toBe('chatting');
      expect(result.status).toBe('online');
      expect(result.mood).toBe('happy');
    });

    it('maps idle activity to idle animation', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentActivity('idle');
      expect(result.animation).toBe('idle');
      expect(result.status).toBe('online');
      expect(result.mood).toBe('neutral');
    });

    it('maps thinking activity to thinking animation', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentActivity('thinking');
      expect(result.animation).toBe('thinking');
      expect(result.status).toBe('busy');
      expect(result.mood).toBe('focused');
    });

    it('maps reviewing activity to working animation', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentActivity('reviewing');
      expect(result.animation).toBe('working');
      expect(result.status).toBe('busy');
      expect(result.mood).toBe('focused');
    });

    it('maps sleeping activity to sleeping animation', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentActivity('sleeping');
      expect(result.animation).toBe('sleeping');
      expect(result.status).toBe('away');
      expect(result.mood).toBe('tired');
    });

    it('maps unknown activity to idle defaults', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentActivity('unknown-activity');
      expect(result.animation).toBe('idle');
      expect(result.status).toBe('online');
      expect(result.mood).toBe('neutral');
    });
  });

  describe('debouncing', () => {
    it('debounces rapid state changes', () => {
      const mapper = new EventMapper();
      const callback = vi.fn();

      mapper.onStateUpdate(callback);
      mapper.debouncedUpdate('coding');
      mapper.debouncedUpdate('chatting');
      mapper.debouncedUpdate('thinking');

      // Nothing called yet
      expect(callback).not.toHaveBeenCalled();

      // After debounce period, only last state fires
      vi.advanceTimersByTime(STATE_DEBOUNCE_MS + 10);
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ animation: 'thinking' }),
      );
    });

    it('fires immediately if enough time passes between updates', () => {
      const mapper = new EventMapper();
      const callback = vi.fn();

      mapper.onStateUpdate(callback);
      mapper.debouncedUpdate('coding');

      vi.advanceTimersByTime(STATE_DEBOUNCE_MS + 10);
      expect(callback).toHaveBeenCalledOnce();

      mapper.debouncedUpdate('chatting');
      vi.advanceTimersByTime(STATE_DEBOUNCE_MS + 10);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('agent event types', () => {
    it('maps task_started to working', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentEvent('task_started', { taskType: 'coding' });
      expect(result.animation).toBe('working');
      expect(result.activity).toBe('coding');
    });

    it('maps task_completed to celebrating', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentEvent('task_completed', {});
      expect(result.animation).toBe('celebrating');
      expect(result.mood).toBe('excited');
    });

    it('maps message_received to chatting', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentEvent('message_received', {});
      expect(result.animation).toBe('chatting');
    });

    it('maps unknown event type to idle', () => {
      const mapper = new EventMapper();
      const result = mapper.mapAgentEvent('unknown_event', {});
      expect(result.animation).toBe('idle');
    });
  });
});
