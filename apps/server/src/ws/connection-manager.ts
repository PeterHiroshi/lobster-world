import type WebSocket from 'ws';
import type { PublicProfile, DownstreamEvent, RenderEvent } from '@lobster-world/protocol';
import { HEARTBEAT_INTERVAL_MS } from '../config.js';

export interface LobsterConnection {
  ws: WebSocket;
  profile: PublicProfile;
  connectedAt: number;
  isAlive: boolean;
}

export interface ViewerConnection {
  ws: WebSocket;
  connectedAt: number;
  isAlive: boolean;
}

type LobsterDisconnectCallback = (lobsterId: string) => void;
type ViewerDisconnectCallback = (viewerId: string) => void;

export class ConnectionManager {
  private lobsters = new Map<string, LobsterConnection>();
  private viewers = new Map<string, ViewerConnection>();
  private viewerCounter = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private onLobsterDisconnectCallbacks: LobsterDisconnectCallback[] = [];
  private onViewerDisconnectCallbacks: ViewerDisconnectCallback[] = [];

  // --- Lobster methods ---

  addLobster(ws: WebSocket, lobsterId: string, profile: PublicProfile): void {
    this.lobsters.set(lobsterId, {
      ws,
      profile,
      connectedAt: Date.now(),
      isAlive: true,
    });

    ws.on('close', () => this.handleLobsterDisconnect(lobsterId));
    ws.on('error', () => this.handleLobsterDisconnect(lobsterId));
    ws.on('pong', () => {
      const conn = this.lobsters.get(lobsterId);
      if (conn) {
        conn.isAlive = true;
      }
    });
  }

  removeLobster(lobsterId: string): void {
    this.lobsters.delete(lobsterId);
  }

  getLobster(lobsterId: string): LobsterConnection | undefined {
    return this.lobsters.get(lobsterId);
  }

  getAllLobsterIds(): string[] {
    return [...this.lobsters.keys()];
  }

  getLobsterCount(): number {
    return this.lobsters.size;
  }

  // --- Viewer methods ---

  addViewer(ws: WebSocket): string {
    this.viewerCounter += 1;
    const viewerId = `viewer-${this.viewerCounter}`;

    this.viewers.set(viewerId, {
      ws,
      connectedAt: Date.now(),
      isAlive: true,
    });

    ws.on('close', () => this.handleViewerDisconnect(viewerId));
    ws.on('error', () => this.handleViewerDisconnect(viewerId));
    ws.on('pong', () => {
      const conn = this.viewers.get(viewerId);
      if (conn) {
        conn.isAlive = true;
      }
    });

    return viewerId;
  }

  removeViewer(viewerId: string): void {
    this.viewers.delete(viewerId);
  }

  getViewerCount(): number {
    return this.viewers.size;
  }

  // --- Messaging methods ---

  sendToLobster(lobsterId: string, message: DownstreamEvent): void {
    const conn = this.lobsters.get(lobsterId);
    if (conn && conn.ws.readyState === conn.ws.OPEN) {
      conn.ws.send(JSON.stringify(message));
    }
  }

  broadcastToLobsters(message: DownstreamEvent): void {
    const payload = JSON.stringify(message);
    for (const conn of this.lobsters.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(payload);
      }
    }
  }

  broadcastToViewers(message: RenderEvent): void {
    const payload = JSON.stringify(message);
    for (const conn of this.viewers.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(payload);
      }
    }
  }

  // --- Heartbeat ---

  startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.pingAll();
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private pingAll(): void {
    for (const [lobsterId, conn] of this.lobsters.entries()) {
      if (!conn.isAlive) {
        conn.ws.terminate();
        this.handleLobsterDisconnect(lobsterId);
        continue;
      }
      conn.isAlive = false;
      conn.ws.ping();
    }

    for (const [viewerId, conn] of this.viewers.entries()) {
      if (!conn.isAlive) {
        conn.ws.terminate();
        this.handleViewerDisconnect(viewerId);
        continue;
      }
      conn.isAlive = false;
      conn.ws.ping();
    }
  }

  // --- Disconnect callbacks ---

  onLobsterDisconnect(callback: LobsterDisconnectCallback): void {
    this.onLobsterDisconnectCallbacks.push(callback);
  }

  onViewerDisconnect(callback: ViewerDisconnectCallback): void {
    this.onViewerDisconnectCallbacks.push(callback);
  }

  private handleLobsterDisconnect(lobsterId: string): void {
    if (!this.lobsters.has(lobsterId)) return;
    this.lobsters.delete(lobsterId);
    for (const cb of this.onLobsterDisconnectCallbacks) {
      cb(lobsterId);
    }
  }

  private handleViewerDisconnect(viewerId: string): void {
    if (!this.viewers.has(viewerId)) return;
    this.viewers.delete(viewerId);
    for (const cb of this.onViewerDisconnectCallbacks) {
      cb(viewerId);
    }
  }
}
