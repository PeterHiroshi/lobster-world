import type WebSocket from 'ws';
import type { ConnectionManager } from './connection-manager.js';
import type { SceneEngine } from '../engine/scene.js';
import type { RenderEvent } from '@lobster-world/protocol';

export interface ViewerHandlerDeps {
  connections: ConnectionManager;
  scene: SceneEngine;
}

export function createViewerHandler(deps: ViewerHandlerDeps) {
  const { connections, scene } = deps;

  return {
    handleConnection(ws: WebSocket): void {
      connections.addViewer(ws);

      const fullSync: RenderEvent = {
        type: 'full_sync',
        scene: scene.getScene(),
      };

      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(fullSync));
      }
    },
  };
}
