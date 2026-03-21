import { describe, it, expect, vi } from 'vitest';
import { EventProcessor } from '../src/engine/events.js';

describe('EventProcessor', () => {
  it('emit stores event with correct fields', () => {
    const ep = new EventProcessor();
    const event = ep.emit('github', 'new_issue', { title: 'bug' });
    expect(event.id).toBe('evt-1');
    expect(event.source).toBe('github');
    expect(event.type).toBe('new_issue');
    expect(event.data).toEqual({ title: 'bug' });
    expect(typeof event.timestamp).toBe('number');
    expect(event.processedBy).toBeUndefined();
  });

  it('emit calls registered handlers', () => {
    const ep = new EventProcessor();
    const handler = vi.fn();
    ep.onEvent(handler);
    const event = ep.emit('slack', 'message', { text: 'hi' });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('multiple handlers are all called', () => {
    const ep = new EventProcessor();
    const h1 = vi.fn();
    const h2 = vi.fn();
    ep.onEvent(h1);
    ep.onEvent(h2);
    ep.emit('internal', 'tick', {});
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('removeHandler stops handler from being called', () => {
    const ep = new EventProcessor();
    const handler = vi.fn();
    ep.onEvent(handler);
    ep.removeHandler(handler);
    ep.emit('github', 'push', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('getRecent returns last N events', () => {
    const ep = new EventProcessor();
    ep.emit('github', 'a', {});
    ep.emit('github', 'b', {});
    ep.emit('github', 'c', {});
    const recent = ep.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].type).toBe('b');
    expect(recent[1].type).toBe('c');
  });

  it('getUnprocessed returns events without processedBy', () => {
    const ep = new EventProcessor();
    const e1 = ep.emit('github', 'a', {});
    ep.emit('github', 'b', {});
    ep.markProcessed(e1.id, 'agent-1');
    const unprocessed = ep.getUnprocessed();
    expect(unprocessed).toHaveLength(1);
    expect(unprocessed[0].type).toBe('b');
  });

  it('markProcessed sets processedBy and returns true', () => {
    const ep = new EventProcessor();
    const event = ep.emit('github', 'test', {});
    const result = ep.markProcessed(event.id, 'agent-x');
    expect(result).toBe(true);
    expect(ep.getRecent(1)[0].processedBy).toBe('agent-x');
  });

  it('markProcessed returns false for non-existent event', () => {
    const ep = new EventProcessor();
    const result = ep.markProcessed('evt-999', 'agent-x');
    expect(result).toBe(false);
  });

  it('getBySource filters events by source', () => {
    const ep = new EventProcessor();
    ep.emit('github', 'push', {});
    ep.emit('slack', 'message', {});
    ep.emit('github', 'pr', {});
    const ghEvents = ep.getBySource('github');
    expect(ghEvents).toHaveLength(2);
    expect(ghEvents.every((e) => e.source === 'github')).toBe(true);
  });

  it('emitNewIssue creates correct event', () => {
    const ep = new EventProcessor();
    const event = ep.emitNewIssue('Fix login bug');
    expect(event.source).toBe('github');
    expect(event.type).toBe('new_issue');
    expect(event.data).toEqual({ title: 'Fix login bug' });
  });

  it('emitPRCreated creates correct event', () => {
    const ep = new EventProcessor();
    const event = ep.emitPRCreated('Add tests', 'alice');
    expect(event.source).toBe('github');
    expect(event.type).toBe('pr_created');
    expect(event.data).toEqual({ title: 'Add tests', author: 'alice' });
  });

  it('emitCIFailed creates correct event', () => {
    const ep = new EventProcessor();
    const event = ep.emitCIFailed('build', 'OOM');
    expect(event.source).toBe('github');
    expect(event.type).toBe('ci_failed');
    expect(event.data).toEqual({ pipeline: 'build', error: 'OOM' });
  });

  it('emitDeploySuccess creates correct event', () => {
    const ep = new EventProcessor();
    const event = ep.emitDeploySuccess('api', 'v1.2.3');
    expect(event.source).toBe('github');
    expect(event.type).toBe('deploy_success');
    expect(event.data).toEqual({ service: 'api', version: 'v1.2.3' });
  });

  it('getEventCount returns total number of events', () => {
    const ep = new EventProcessor();
    expect(ep.getEventCount()).toBe(0);
    ep.emit('github', 'a', {});
    ep.emit('slack', 'b', {});
    expect(ep.getEventCount()).toBe(2);
  });

  it('handler receives event with correct data', () => {
    const ep = new EventProcessor();
    const handler = vi.fn();
    ep.onEvent(handler);
    ep.emit('notion', 'page_updated', { pageId: 'abc', title: 'Notes' });
    const received = handler.mock.calls[0][0];
    expect(received.source).toBe('notion');
    expect(received.type).toBe('page_updated');
    expect(received.data).toEqual({ pageId: 'abc', title: 'Notes' });
    expect(received.id).toBe('evt-1');
  });
});
