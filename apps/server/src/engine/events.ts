import type { PlatformEvent, PlatformEventSource } from '@lobster-world/protocol';

export type EventHandler = (event: PlatformEvent) => void;

export class EventProcessor {
  private events: PlatformEvent[] = [];
  private handlers: EventHandler[] = [];
  private nextId: number = 1;

  emit(source: PlatformEventSource, type: string, data: Record<string, unknown>): PlatformEvent {
    const event: PlatformEvent = {
      id: `evt-${this.nextId++}`,
      source,
      type,
      data,
      timestamp: Date.now(),
    };
    this.events.push(event);
    for (const handler of this.handlers) {
      handler(event);
    }
    return event;
  }

  markProcessed(eventId: string, agentId: string): boolean {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return false;
    event.processedBy = agentId;
    return true;
  }

  getRecent(count: number): PlatformEvent[] {
    return this.events.slice(-count);
  }

  getUnprocessed(): PlatformEvent[] {
    return this.events.filter((e) => e.processedBy === undefined);
  }

  getBySource(source: PlatformEventSource): PlatformEvent[] {
    return this.events.filter((e) => e.source === source);
  }

  onEvent(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  removeHandler(handler: EventHandler): void {
    const idx = this.handlers.indexOf(handler);
    if (idx !== -1) {
      this.handlers.splice(idx, 1);
    }
  }

  getEventCount(): number {
    return this.events.length;
  }

  emitNewIssue(title: string): PlatformEvent {
    return this.emit('github', 'new_issue', { title });
  }

  emitPRCreated(title: string, author: string): PlatformEvent {
    return this.emit('github', 'pr_created', { title, author });
  }

  emitCIFailed(pipeline: string, error: string): PlatformEvent {
    return this.emit('github', 'ci_failed', { pipeline, error });
  }

  emitDeploySuccess(service: string, version: string): PlatformEvent {
    return this.emit('github', 'deploy_success', { service, version });
  }
}
