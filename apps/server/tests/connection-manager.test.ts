import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type WebSocket from 'ws';
import type { PublicProfile, DownstreamEvent, RenderEvent } from '@lobster-world/protocol';
import { ConnectionManager } from '../src/ws/connection-manager.js';

function createMockWs(readyState = 1): WebSocket {
  const listeners = new Map<string, Array<() => void>>();
  const ws = {
    readyState,
    OPEN: 1,
    send: vi.fn(),
    ping: vi.fn(),
    close: vi.fn(),
    terminate: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(handler);
    }),
    // Helper to trigger events in tests
    _emit(event: string) {
      const handlers = listeners.get(event);
      if (handlers) {
        for (const h of handlers) h();
      }
    },
  } as unknown as WebSocket & { _emit: (event: string) => void };
  return ws;
}

function createProfile(id: string): PublicProfile {
  return {
    id,
    name: `Lobster ${id}`,
    color: '#ff0000',
    skills: ['coding'],
  };
}

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new ConnectionManager();
  });

  afterEach(() => {
    manager.stopHeartbeat();
    vi.useRealTimers();
  });

  // --- Lobster connection management ---

  describe('addLobster / removeLobster / getLobster', () => {
    it('should add and retrieve a lobster connection', () => {
      const ws = createMockWs();
      const profile = createProfile('l1');
      manager.addLobster(ws, 'l1', profile);

      const conn = manager.getLobster('l1');
      expect(conn).toBeDefined();
      expect(conn!.ws).toBe(ws);
      expect(conn!.profile).toBe(profile);
      expect(conn!.connectedAt).toBeTypeOf('number');
    });

    it('should return undefined for unknown lobster', () => {
      expect(manager.getLobster('unknown')).toBeUndefined();
    });

    it('should remove a lobster', () => {
      const ws = createMockWs();
      manager.addLobster(ws, 'l1', createProfile('l1'));
      manager.removeLobster('l1');
      expect(manager.getLobster('l1')).toBeUndefined();
    });
  });

  describe('getAllLobsterIds', () => {
    it('should return all connected lobster IDs', () => {
      manager.addLobster(createMockWs(), 'l1', createProfile('l1'));
      manager.addLobster(createMockWs(), 'l2', createProfile('l2'));

      const ids = manager.getAllLobsterIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('l1');
      expect(ids).toContain('l2');
    });
  });

  describe('getLobsterCount', () => {
    it('should return the count of connected lobsters', () => {
      expect(manager.getLobsterCount()).toBe(0);
      manager.addLobster(createMockWs(), 'l1', createProfile('l1'));
      expect(manager.getLobsterCount()).toBe(1);
      manager.addLobster(createMockWs(), 'l2', createProfile('l2'));
      expect(manager.getLobsterCount()).toBe(2);
      manager.removeLobster('l1');
      expect(manager.getLobsterCount()).toBe(1);
    });
  });

  // --- Viewer connection management ---

  describe('addViewer / removeViewer', () => {
    it('should add a viewer and return a viewer ID', () => {
      const ws = createMockWs();
      const viewerId = manager.addViewer(ws);
      expect(viewerId).toMatch(/^viewer-/);
    });

    it('should assign unique IDs to viewers', () => {
      const id1 = manager.addViewer(createMockWs());
      const id2 = manager.addViewer(createMockWs());
      expect(id1).not.toBe(id2);
    });

    it('should remove a viewer', () => {
      const viewerId = manager.addViewer(createMockWs());
      expect(manager.getViewerCount()).toBe(1);
      manager.removeViewer(viewerId);
      expect(manager.getViewerCount()).toBe(0);
    });
  });

  describe('getViewerCount', () => {
    it('should return the count of connected viewers', () => {
      expect(manager.getViewerCount()).toBe(0);
      manager.addViewer(createMockWs());
      expect(manager.getViewerCount()).toBe(1);
    });
  });

  // --- Messaging ---

  describe('sendToLobster', () => {
    it('should send a JSON message to a specific lobster', () => {
      const ws = createMockWs();
      manager.addLobster(ws, 'l1', createProfile('l1'));

      const msg: DownstreamEvent = { type: 'system_notice', message: 'hello' };
      manager.sendToLobster('l1', msg);

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(msg));
    });

    it('should not send if websocket is not open', () => {
      const ws = createMockWs(3); // CLOSED
      manager.addLobster(ws, 'l1', createProfile('l1'));

      manager.sendToLobster('l1', { type: 'system_notice', message: 'hello' });
      expect(ws.send).not.toHaveBeenCalled();
    });

    it('should not throw for unknown lobster', () => {
      expect(() => {
        manager.sendToLobster('unknown', { type: 'system_notice', message: 'hello' });
      }).not.toThrow();
    });
  });

  describe('broadcastToLobsters', () => {
    it('should send to all connected lobsters', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      manager.addLobster(ws1, 'l1', createProfile('l1'));
      manager.addLobster(ws2, 'l2', createProfile('l2'));

      const msg: DownstreamEvent = { type: 'system_notice', message: 'broadcast' };
      manager.broadcastToLobsters(msg);

      const payload = JSON.stringify(msg);
      expect(ws1.send).toHaveBeenCalledWith(payload);
      expect(ws2.send).toHaveBeenCalledWith(payload);
    });

    it('should skip lobsters with closed websockets', () => {
      const wsOpen = createMockWs(1);
      const wsClosed = createMockWs(3);
      manager.addLobster(wsOpen, 'l1', createProfile('l1'));
      manager.addLobster(wsClosed, 'l2', createProfile('l2'));

      manager.broadcastToLobsters({ type: 'system_notice', message: 'test' });
      expect(wsOpen.send).toHaveBeenCalled();
      expect(wsClosed.send).not.toHaveBeenCalled();
    });
  });

  describe('broadcastToViewers', () => {
    it('should send to all connected viewers', () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      manager.addViewer(ws1);
      manager.addViewer(ws2);

      const msg: RenderEvent = { type: 'lobster_leave', lobsterId: 'l1' };
      manager.broadcastToViewers(msg);

      const payload = JSON.stringify(msg);
      expect(ws1.send).toHaveBeenCalledWith(payload);
      expect(ws2.send).toHaveBeenCalledWith(payload);
    });

    it('should skip viewers with closed websockets', () => {
      const wsOpen = createMockWs(1);
      const wsClosed = createMockWs(3);
      manager.addViewer(wsOpen);
      manager.addViewer(wsClosed);

      manager.broadcastToViewers({ type: 'lobster_leave', lobsterId: 'l1' });
      expect(wsOpen.send).toHaveBeenCalled();
      expect(wsClosed.send).not.toHaveBeenCalled();
    });
  });

  // --- Heartbeat ---

  describe('heartbeat', () => {
    it('should ping all connections on heartbeat interval', () => {
      const wsLobster = createMockWs();
      const wsViewer = createMockWs();
      manager.addLobster(wsLobster, 'l1', createProfile('l1'));
      manager.addViewer(wsViewer);

      manager.startHeartbeat();
      vi.advanceTimersByTime(30000);

      expect(wsLobster.ping).toHaveBeenCalled();
      expect(wsViewer.ping).toHaveBeenCalled();
    });

    it('should terminate connections that did not respond with pong', () => {
      const ws = createMockWs();
      manager.addLobster(ws, 'l1', createProfile('l1'));

      manager.startHeartbeat();

      // First tick: marks isAlive = false, pings
      vi.advanceTimersByTime(30000);
      expect(ws.ping).toHaveBeenCalledTimes(1);

      // Second tick: isAlive is still false, should terminate
      vi.advanceTimersByTime(30000);
      expect(ws.terminate).toHaveBeenCalled();
    });

    it('should not terminate connections that responded with pong', () => {
      const ws = createMockWs() as WebSocket & { _emit: (event: string) => void };
      manager.addLobster(ws, 'l1', createProfile('l1'));

      manager.startHeartbeat();

      // First tick
      vi.advanceTimersByTime(30000);
      // Simulate pong response
      ws._emit('pong');

      // Second tick: isAlive was reset to true, should ping again
      vi.advanceTimersByTime(30000);
      expect(ws.terminate).not.toHaveBeenCalled();
      expect(ws.ping).toHaveBeenCalledTimes(2);
    });

    it('should stop heartbeat when stopHeartbeat is called', () => {
      const ws = createMockWs();
      manager.addLobster(ws, 'l1', createProfile('l1'));

      manager.startHeartbeat();
      manager.stopHeartbeat();

      vi.advanceTimersByTime(60000);
      expect(ws.ping).not.toHaveBeenCalled();
    });
  });

  // --- Disconnect callbacks ---

  describe('disconnect callbacks', () => {
    it('should call onLobsterDisconnect when a lobster ws closes', () => {
      const ws = createMockWs() as WebSocket & { _emit: (event: string) => void };
      const callback = vi.fn();
      manager.onLobsterDisconnect(callback);
      manager.addLobster(ws, 'l1', createProfile('l1'));

      ws._emit('close');

      expect(callback).toHaveBeenCalledWith('l1');
      expect(manager.getLobster('l1')).toBeUndefined();
    });

    it('should call onViewerDisconnect when a viewer ws closes', () => {
      const ws = createMockWs() as WebSocket & { _emit: (event: string) => void };
      const callback = vi.fn();
      manager.onViewerDisconnect(callback);
      const viewerId = manager.addViewer(ws);

      ws._emit('close');

      expect(callback).toHaveBeenCalledWith(viewerId);
      expect(manager.getViewerCount()).toBe(0);
    });

    it('should call onLobsterDisconnect on ws error', () => {
      const ws = createMockWs() as WebSocket & { _emit: (event: string) => void };
      const callback = vi.fn();
      manager.onLobsterDisconnect(callback);
      manager.addLobster(ws, 'l1', createProfile('l1'));

      ws._emit('error');

      expect(callback).toHaveBeenCalledWith('l1');
    });

    it('should not call callback twice if close fires after error', () => {
      const ws = createMockWs() as WebSocket & { _emit: (event: string) => void };
      const callback = vi.fn();
      manager.onLobsterDisconnect(callback);
      manager.addLobster(ws, 'l1', createProfile('l1'));

      ws._emit('error');
      ws._emit('close');

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
