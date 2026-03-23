import type { RenderEvent } from '@lobster-world/protocol';
import { WS_BATCH_INTERVAL_MS, WS_MAX_BATCH_SIZE } from '../config.js';

export type BroadcastFn = (event: RenderEvent) => void;

/**
 * Batches RenderEvents and flushes them periodically or when the
 * buffer reaches WS_MAX_BATCH_SIZE. Events are sent as a single
 * `render_batch` message to reduce per-message overhead at scale.
 */
export class SceneEventBatcher {
  private buffer: RenderEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly broadcastFn: BroadcastFn;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;

  constructor(
    broadcastFn: BroadcastFn,
    flushIntervalMs = WS_BATCH_INTERVAL_MS,
    maxBatchSize = WS_MAX_BATCH_SIZE,
  ) {
    this.broadcastFn = broadcastFn;
    this.flushIntervalMs = flushIntervalMs;
    this.maxBatchSize = maxBatchSize;
  }

  queueEvent(event: RenderEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  queueEvents(events: RenderEvent[]): void {
    for (const event of events) {
      this.buffer.push(event);
      if (this.buffer.length >= this.maxBatchSize) {
        this.flush();
      }
    }
  }

  start(): void {
    this.stop();
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.maxBatchSize);

    if (batch.length === 1) {
      // Single event — send directly without wrapping
      this.broadcastFn(batch[0]);
    } else {
      this.broadcastFn({ type: 'render_batch', events: batch });
    }
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  isRunning(): boolean {
    return this.timer !== null;
  }
}
