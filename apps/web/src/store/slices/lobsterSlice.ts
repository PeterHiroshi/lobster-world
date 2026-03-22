import type { StateCreator } from 'zustand';
import type { LobsterState, Vec3 } from '@lobster-world/protocol';

export interface LobsterStats {
  messagesSent: number;
  dialoguesParticipated: number;
}

export interface EffectEntry {
  id: string;
  position: Vec3;
  type: 'sparkle' | 'confetti' | 'dust';
  startTime: number;
}

export interface EntranceAnimation {
  targetPos: Vec3;
  startTime: number;
}

let effectCounter = 0;

export function nextEffectId(): string {
  return `effect-${++effectCounter}`;
}

export interface LobsterSlice {
  lobsters: Record<string, LobsterState>;
  lobsterStats: Record<string, LobsterStats>;
  entranceAnimations: Record<string, EntranceAnimation>;
  effects: EffectEntry[];

  clearBubble: (lobsterId: string) => void;
  removeEffect: (id: string) => void;
  clearEntrance: (lobsterId: string) => void;
}

export const createLobsterSlice: StateCreator<LobsterSlice, [], [], LobsterSlice> = (set) => ({
  lobsters: {},
  lobsterStats: {},
  entranceAnimations: {},
  effects: [],

  clearBubble: (lobsterId: string) => {
    set((state) => {
      const existing = state.lobsters[lobsterId];
      if (!existing || !existing.bubbleText) return state;
      return {
        lobsters: {
          ...state.lobsters,
          [lobsterId]: { ...existing, bubbleText: undefined },
        },
      };
    });
  },

  removeEffect: (id: string) => {
    set((state) => ({
      effects: state.effects.filter((e) => e.id !== id),
    }));
  },

  clearEntrance: (lobsterId: string) => {
    set((state) => {
      const updated = { ...state.entranceAnimations };
      delete updated[lobsterId];
      return { entranceAnimations: updated };
    });
  },
});
