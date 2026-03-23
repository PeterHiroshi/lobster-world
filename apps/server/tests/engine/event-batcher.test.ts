import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RenderEvent } from '@lobster-world/protocol';
import { SceneEventBatcher } from '../../src/engine/event-batcher.js';

function makeEvent(lobsterId: string): RenderEvent {
  return { type: 'lobster_update', lobsterId, delta: { animation: 'walking' } };
}

describe('SceneEventBatcher', () => {
  let broadcastFn: ReturnType<typeof vi.fn>;
  let batcher: SceneEventBatcher;

  beforeEach(() => {
    vi.useFakeTimers();
    broadcastFn = vi.fn();
    batcher = new SceneEventBatcher(broadcastFn, 100, 5);
  });

  afterEach(() => {
    batcher.stop();
    vi.useRealTimers();
  });

  describe('queueEvent', () => {
    it('should buffer events without flushing immediately', () => {
      batcher.queueEvent(makeEvent('l1'));
      expect(broadcastFn).not.toHaveBeenCalled();
      expect(batcher.getBufferSize()).toBe(1);
    });

    it('should auto-flush when buffer reaches maxBatchSize', () => {
      for (let i = 0; i < 5; i++) {
        batcher.queueEvent(makeEvent(`l${i}`));
      }
      expect(broadcastFn).toHaveBeenCalledTimes(1);
      const call = broadcastFn.mock.calls[0][0] as RenderEvent;
      expect(call.type).toBe('render_batch');
      if (call.type === 'render_batch') {
        expect(call.events).toHaveLength(5);
      }
      expect(batcher.getBufferSize()).toBe(0);
    });
  });

  describe('queueEvents', () => {
    it('should queue multiple events at once', () => {
      batcher.queueEvents([makeEvent('l1'), makeEvent('l2')]);
      expect(batcher.getBufferSize()).toBe(2);
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('should flush mid-queue when hitting maxBatchSize', () => {
      const events = Array.from({ length: 7 }, (_, i) => makeEvent(`l${i}`));
      batcher.queueEvents(events);
      // First 5 flushed, 2 remaining
      expect(broadcastFn).toHaveBeenCalledTimes(1);
      expect(batcher.getBufferSize()).toBe(2);
    });
  });

  describe('flush', () => {
    it('should send single event directly without wrapping', () => {
      const event = makeEvent('l1');
      batcher.queueEvent(event);
      batcher.flush();
      expect(broadcastFn).toHaveBeenCalledWith(event);
    });

    it('should wrap multiple events in render_batch', () => {
      batcher.queueEvent(makeEvent('l1'));
      batcher.queueEvent(makeEvent('l2'));
      batcher.flush();

      const call = broadcastFn.mock.calls[0][0] as RenderEvent;
      expect(call.type).toBe('render_batch');
      if (call.type === 'render_batch') {
        expect(call.events).toHaveLength(2);
      }
    });

    it('should not broadcast when buffer is empty', () => {
      batcher.flush();
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('should clear buffer after flush', () => {
      batcher.queueEvent(makeEvent('l1'));
      batcher.flush();
      expect(batcher.getBufferSize()).toBe(0);
    });

    it('should flush at most maxBatchSize events per call', () => {
      for (let i = 0; i < 3; i++) {
        batcher.queueEvent(makeEvent(`l${i}`));
      }
      // Buffer has 3, max batch is 5, so flush should take all 3
      batcher.flush();
      expect(broadcastFn).toHaveBeenCalledTimes(1);
      expect(batcher.getBufferSize()).toBe(0);

      // Now test with more than max
      for (let i = 0; i < 8; i++) {
        batcher.queueEvent(makeEvent(`l${i}`));
      }
      // Auto-flush at 5, leaves 3
      expect(broadcastFn).toHaveBeenCalledTimes(2); // 1st manual flush + 1 auto-flush at 5
      batcher.flush(); // flush remaining 3
      expect(batcher.getBufferSize()).toBe(0);
      expect(broadcastFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('start / stop', () => {
    it('should flush periodically when started', () => {
      batcher.start();
      batcher.queueEvent(makeEvent('l1'));

      vi.advanceTimersByTime(100);
      expect(broadcastFn).toHaveBeenCalledTimes(1);

      batcher.queueEvent(makeEvent('l2'));
      vi.advanceTimersByTime(100);
      expect(broadcastFn).toHaveBeenCalledTimes(2);
    });

    it('should stop periodic flushing', () => {
      batcher.start();
      batcher.stop();

      batcher.queueEvent(makeEvent('l1'));
      vi.advanceTimersByTime(200);
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('should report running state', () => {
      expect(batcher.isRunning()).toBe(false);
      batcher.start();
      expect(batcher.isRunning()).toBe(true);
      batcher.stop();
      expect(batcher.isRunning()).toBe(false);
    });

    it('should restart cleanly when start called twice', () => {
      batcher.start();
      batcher.start(); // should not create duplicate intervals

      batcher.queueEvent(makeEvent('l1'));
      vi.advanceTimersByTime(100);
      // Should only flush once, not twice
      expect(broadcastFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBufferSize', () => {
    it('should track buffer size accurately', () => {
      expect(batcher.getBufferSize()).toBe(0);
      batcher.queueEvent(makeEvent('l1'));
      expect(batcher.getBufferSize()).toBe(1);
      batcher.queueEvent(makeEvent('l2'));
      expect(batcher.getBufferSize()).toBe(2);
      batcher.flush();
      expect(batcher.getBufferSize()).toBe(0);
    });
  });
});
