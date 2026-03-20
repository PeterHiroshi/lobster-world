import { create } from 'zustand';
import type {
  LobsterState,
  RenderEvent,
  DialogueSession,
} from '@lobster-world/protocol';
import { BUBBLE_TIMEOUT_MS } from '../lib/constants';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WorldStats {
  lobsterCount: number;
  activeDialogues: number;
  totalMessages: number;
}

interface WorldState {
  lobsters: Record<string, LobsterState>;
  dialogues: DialogueSession[];
  connectionStatus: ConnectionStatus;
  stats: WorldStats;
  focusLobsterId: string | null;

  handleRenderEvent: (event: RenderEvent) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setFocusLobster: (id: string | null) => void;
  clearBubble: (lobsterId: string) => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  lobsters: {},
  dialogues: [],
  connectionStatus: 'disconnected',
  stats: { lobsterCount: 0, activeDialogues: 0, totalMessages: 0 },
  focusLobsterId: null,

  handleRenderEvent: (event: RenderEvent) => {
    switch (event.type) {
      case 'full_sync': {
        const lobsters = event.scene.lobsters;
        set({
          lobsters,
          stats: {
            ...get().stats,
            lobsterCount: Object.keys(lobsters).length,
          },
        });
        break;
      }
      case 'lobster_join': {
        set((state) => {
          const lobsters = { ...state.lobsters, [event.lobster.id]: event.lobster };
          return {
            lobsters,
            stats: { ...state.stats, lobsterCount: Object.keys(lobsters).length },
          };
        });
        break;
      }
      case 'lobster_leave': {
        set((state) => {
          const lobsters = { ...state.lobsters };
          delete lobsters[event.lobsterId];
          return {
            lobsters,
            stats: { ...state.stats, lobsterCount: Object.keys(lobsters).length },
            focusLobsterId:
              state.focusLobsterId === event.lobsterId ? null : state.focusLobsterId,
          };
        });
        break;
      }
      case 'lobster_update': {
        set((state) => {
          const existing = state.lobsters[event.lobsterId];
          if (!existing) return state;
          const updated = { ...existing, ...event.delta };
          return {
            lobsters: { ...state.lobsters, [event.lobsterId]: updated },
          };
        });
        break;
      }
      case 'dialogue_bubble': {
        set((state) => {
          const lobsters = { ...state.lobsters };
          for (const id of event.lobsterIds) {
            if (lobsters[id]) {
              lobsters[id] = {
                ...lobsters[id],
                bubbleText: event.preview ?? '...',
              };
            }
          }
          return {
            lobsters,
            stats: {
              ...state.stats,
              totalMessages: state.stats.totalMessages + 1,
              activeDialogues: state.stats.activeDialogues,
            },
          };
        });
        // Auto-clear bubbles
        for (const id of event.lobsterIds) {
          setTimeout(() => get().clearBubble(id), BUBBLE_TIMEOUT_MS);
        }
        break;
      }
      case 'effect': {
        // Visual effects — handled by scene directly if needed
        break;
      }
    }
  },

  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  setFocusLobster: (id: string | null) => {
    set({ focusLobsterId: id });
  },

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
}));
