import type WebSocket from 'ws';
import { WS_MAX_CONNECTIONS } from '../config.js';

export interface PooledConnection {
  ws: WebSocket;
  lastActivity: number;
}

/**
 * Manages a bounded pool of WebSocket connections with LRU eviction.
 * When the pool is full, the least-recently-active connection is
 * terminated to make room for new ones.
 */
export class ConnectionPool {
  private connections = new Map<string, PooledConnection>();
  private readonly maxConnections: number;

  constructor(maxConnections = WS_MAX_CONNECTIONS) {
    this.maxConnections = maxConnections;
  }

  /**
   * Add a connection. Returns true if added, false if eviction happened
   * (the evicted connection is terminated automatically).
   */
  add(id: string, ws: WebSocket): boolean {
    let evicted = false;
    if (this.connections.size >= this.maxConnections && !this.connections.has(id)) {
      this.evictLeastRecentlyUsed();
      evicted = true;
    }
    this.connections.set(id, { ws, lastActivity: Date.now() });
    return evicted;
  }

  remove(id: string): void {
    this.connections.delete(id);
  }

  get(id: string): PooledConnection | undefined {
    return this.connections.get(id);
  }

  touch(id: string): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.lastActivity = Date.now();
    }
  }

  has(id: string): boolean {
    return this.connections.has(id);
  }

  get size(): number {
    return this.connections.size;
  }

  get capacity(): number {
    return this.maxConnections;
  }

  isFull(): boolean {
    return this.connections.size >= this.maxConnections;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, conn] of this.connections) {
      if (conn.lastActivity < oldestTime) {
        oldestTime = conn.lastActivity;
        oldestId = id;
      }
    }

    if (oldestId !== null) {
      const conn = this.connections.get(oldestId);
      if (conn) {
        conn.ws.close();
      }
      this.connections.delete(oldestId);
    }
  }
}
