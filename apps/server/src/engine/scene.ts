import type {
  Scene,
  SceneObject,
  LobsterState,
  RenderEvent,
} from '@lobster-world/protocol';
import {
  MAX_LOBSTERS_PER_SCENE,
} from '../config.js';

const DEFAULT_SCENE_ID = 'office-main';
const DEFAULT_SCENE_NAME = 'Virtual Office';

function createDefaultObjects(): SceneObject[] {
  return [
    {
      id: 'desk-1',
      type: 'desk',
      position: { x: -4, y: 0, z: -2 },
      rotation: 0,
      interactable: true,
    },
    {
      id: 'desk-2',
      type: 'desk',
      position: { x: 0, y: 0, z: -2 },
      rotation: 0,
      interactable: true,
    },
    {
      id: 'desk-3',
      type: 'desk',
      position: { x: 4, y: 0, z: -2 },
      rotation: 0,
      interactable: true,
    },
    {
      id: 'coffee-area',
      type: 'coffee',
      position: { x: 6, y: 0, z: 4 },
      rotation: Math.PI / 2,
      interactable: true,
    },
    {
      id: 'whiteboard-1',
      type: 'whiteboard',
      position: { x: -6, y: 1.5, z: 0 },
      rotation: Math.PI / 2,
      interactable: true,
    },
  ];
}

type JoinEvent = { type: 'lobster_join'; lobster: LobsterState };
type LeaveEvent = { type: 'lobster_leave'; lobsterId: string };
type UpdateEvent = { type: 'lobster_update'; lobsterId: string; delta: Partial<LobsterState> };

export class SceneEngine {
  private scene: Scene;
  private pendingJoins: JoinEvent[] = [];
  private pendingLeaves: LeaveEvent[] = [];
  private pendingDeltas: Map<string, Partial<LobsterState>> = new Map();

  constructor() {
    this.scene = {
      id: DEFAULT_SCENE_ID,
      name: DEFAULT_SCENE_NAME,
      type: 'office',
      capacity: MAX_LOBSTERS_PER_SCENE,
      lobsters: {},
      objects: createDefaultObjects(),
    };
  }

  getScene(): Scene {
    return this.scene;
  }

  addLobster(state: LobsterState): void {
    this.scene.lobsters[state.id] = state;
    this.pendingJoins.push({ type: 'lobster_join', lobster: state });
  }

  removeLobster(lobsterId: string): void {
    delete this.scene.lobsters[lobsterId];
    // Clean up any pending deltas for this lobster since they're leaving
    this.pendingDeltas.delete(lobsterId);
    this.pendingLeaves.push({ type: 'lobster_leave', lobsterId });
  }

  updateLobster(lobsterId: string, delta: Partial<LobsterState>): void {
    const lobster = this.scene.lobsters[lobsterId];
    if (!lobster) {
      return;
    }

    // Apply delta to the scene state
    Object.assign(lobster, delta);

    // Accumulate delta for pending events
    const existing = this.pendingDeltas.get(lobsterId);
    if (existing) {
      Object.assign(existing, delta);
    } else {
      this.pendingDeltas.set(lobsterId, { ...delta });
    }
  }

  getLobster(lobsterId: string): LobsterState | undefined {
    return this.scene.lobsters[lobsterId];
  }

  getPendingEvents(): RenderEvent[] {
    const events: RenderEvent[] = [];

    for (const join of this.pendingJoins) {
      events.push(join);
    }

    for (const leave of this.pendingLeaves) {
      events.push(leave);
    }

    for (const [lobsterId, delta] of this.pendingDeltas) {
      events.push({ type: 'lobster_update', lobsterId, delta });
    }

    // Clear all pending state
    this.pendingJoins = [];
    this.pendingLeaves = [];
    this.pendingDeltas = new Map();

    return events;
  }

  isFull(): boolean {
    return this.getLobsterCount() >= this.scene.capacity;
  }

  getLobsterCount(): number {
    return Object.keys(this.scene.lobsters).length;
  }
}
