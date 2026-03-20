import { create } from 'zustand';
import type {
  LobsterState,
  RenderEvent,
  DialogueSession,
  Vec3,
} from '@lobster-world/protocol';
import { BUBBLE_TIMEOUT_MS } from '../lib/constants';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WorldStats {
  lobsterCount: number;
  activeDialogues: number;
  totalMessages: number;
}

export interface DialogueMessageEntry {
  fromId: string;
  fromName: string;
  fromColor: string;
  content: string;
  turnNumber: number;
  timestamp: number;
}

export interface ActiveDialogue {
  sessionId: string;
  participants: string[];
  participantNames: string[];
  participantColors: string[];
  intent: string;
  messages: DialogueMessageEntry[];
  ended: boolean;
  endReason?: string;
}

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

interface WorldState {
  lobsters: Record<string, LobsterState>;
  dialogues: DialogueSession[];
  connectionStatus: ConnectionStatus;
  stats: WorldStats;
  focusLobsterId: string | null;
  selectedLobsterId: string | null;
  lobsterStats: Record<string, LobsterStats>;
  activeDialogues: Record<string, ActiveDialogue>;
  effects: EffectEntry[];

  handleRenderEvent: (event: RenderEvent) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setFocusLobster: (id: string | null) => void;
  setSelectedLobster: (id: string | null) => void;
  clearBubble: (lobsterId: string) => void;
  removeEffect: (id: string) => void;
}

let effectCounter = 0;

export const useWorldStore = create<WorldState>((set, get) => ({
  lobsters: {},
  dialogues: [],
  connectionStatus: 'disconnected',
  stats: { lobsterCount: 0, activeDialogues: 0, totalMessages: 0 },
  focusLobsterId: null,
  selectedLobsterId: null,
  lobsterStats: {},
  activeDialogues: {},
  effects: [],

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
          // Add confetti effect at join position
          const effectId = `effect-${++effectCounter}`;
          const newEffect: EffectEntry = {
            id: effectId,
            position: event.lobster.position,
            type: 'confetti',
            startTime: Date.now(),
          };
          return {
            lobsters,
            stats: { ...state.stats, lobsterCount: Object.keys(lobsters).length },
            effects: [...state.effects, newEffect],
          };
        });
        // Auto-remove confetti after 3s
        const id = `effect-${effectCounter}`;
        setTimeout(() => get().removeEffect(id), 3000);
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
            selectedLobsterId:
              state.selectedLobsterId === event.lobsterId ? null : state.selectedLobsterId,
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
        for (const id of event.lobsterIds) {
          setTimeout(() => get().clearBubble(id), BUBBLE_TIMEOUT_MS);
        }
        break;
      }
      case 'dialogue_start': {
        set((state) => {
          const newDialogue: ActiveDialogue = {
            sessionId: event.sessionId,
            participants: event.participants,
            participantNames: event.participantNames,
            participantColors: event.participantColors,
            intent: event.intent,
            messages: [],
            ended: false,
          };

          // Track stats
          const lobsterStats = { ...state.lobsterStats };
          for (const pid of event.participants) {
            const existing = lobsterStats[pid] ?? { messagesSent: 0, dialoguesParticipated: 0 };
            lobsterStats[pid] = { ...existing, dialoguesParticipated: existing.dialoguesParticipated + 1 };
          }

          // Add sparkle effect between participants
          const l1 = state.lobsters[event.participants[0]];
          const l2 = state.lobsters[event.participants[1]];
          let newEffects = state.effects;
          if (l1 && l2) {
            const effectId = `effect-${++effectCounter}`;
            newEffects = [...state.effects, {
              id: effectId,
              position: {
                x: (l1.position.x + l2.position.x) / 2,
                y: (l1.position.y + l2.position.y) / 2 + 0.5,
                z: (l1.position.z + l2.position.z) / 2,
              },
              type: 'sparkle' as const,
              startTime: Date.now(),
            }];
            setTimeout(() => get().removeEffect(effectId), 3000);
          }

          return {
            activeDialogues: { ...state.activeDialogues, [event.sessionId]: newDialogue },
            stats: { ...state.stats, activeDialogues: state.stats.activeDialogues + 1 },
            lobsterStats,
            effects: newEffects,
          };
        });
        break;
      }
      case 'dialogue_msg': {
        set((state) => {
          const dialogue = state.activeDialogues[event.sessionId];
          if (!dialogue) return state;

          const newMessage: DialogueMessageEntry = {
            fromId: event.fromId,
            fromName: event.fromName,
            fromColor: event.fromColor,
            content: event.content,
            turnNumber: event.turnNumber,
            timestamp: Date.now(),
          };

          const lobsterStats = { ...state.lobsterStats };
          const existing = lobsterStats[event.fromId] ?? { messagesSent: 0, dialoguesParticipated: 0 };
          lobsterStats[event.fromId] = { ...existing, messagesSent: existing.messagesSent + 1 };

          return {
            activeDialogues: {
              ...state.activeDialogues,
              [event.sessionId]: {
                ...dialogue,
                messages: [...dialogue.messages, newMessage],
              },
            },
            lobsterStats,
          };
        });
        break;
      }
      case 'dialogue_end': {
        set((state) => {
          const dialogue = state.activeDialogues[event.sessionId];
          if (!dialogue) return state;

          return {
            activeDialogues: {
              ...state.activeDialogues,
              [event.sessionId]: {
                ...dialogue,
                ended: true,
                endReason: event.reason,
              },
            },
            stats: { ...state.stats, activeDialogues: Math.max(0, state.stats.activeDialogues - 1) },
          };
        });
        // Remove ended dialogue from active list after 10s
        setTimeout(() => {
          set((state) => {
            const updated = { ...state.activeDialogues };
            delete updated[event.sessionId];
            return { activeDialogues: updated };
          });
        }, 10000);
        break;
      }
      case 'effect': {
        const effectId = `effect-${++effectCounter}`;
        const newEffect: EffectEntry = {
          id: effectId,
          position: event.position,
          type: event.effectType as EffectEntry['type'],
          startTime: Date.now(),
        };
        set((state) => ({ effects: [...state.effects, newEffect] }));
        setTimeout(() => get().removeEffect(effectId), 3000);
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

  setSelectedLobster: (id: string | null) => {
    set({ selectedLobsterId: id });
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

  removeEffect: (id: string) => {
    set((state) => ({
      effects: state.effects.filter((e) => e.id !== id),
    }));
  },
}));
