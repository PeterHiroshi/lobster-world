import { create } from 'zustand';
import type { LobsterState, RenderEvent, Vec3 } from '@lobster-world/protocol';
import { PERMISSION_AUTO_DISMISS_MS } from '@lobster-world/protocol';
import { BUBBLE_TIMEOUT_MS } from '../lib/constants';
import { playChatPing, playJoinSound } from '../lib/audio';

import { createLobsterSlice, nextEffectId } from './slices/lobsterSlice';
import type { LobsterSlice, EffectEntry } from './slices/lobsterSlice';
import { createDialogueSlice } from './slices/dialogueSlice';
import type { DialogueSlice, ActiveDialogue, DialogueMessageEntry } from './slices/dialogueSlice';
import { createLobbySlice } from './slices/lobbySlice';
import type { LobbySlice } from './slices/lobbySlice';
import { createTaskSlice } from './slices/taskSlice';
import type { TaskSlice, TaskCardAnimation } from './slices/taskSlice';
import { createUiSlice } from './slices/uiSlice';
import type { UiSlice } from './slices/uiSlice';

// Re-export types for backward compatibility
export type { ConnectionStatus, WorldStats, Theme } from './slices/uiSlice';
export type { DialogueMessageEntry, ActiveDialogue } from './slices/dialogueSlice';
export type { LobsterStats, EffectEntry, EntranceAnimation } from './slices/lobsterSlice';
export type { TeamAgent, TaskCardAnimation } from './slices/taskSlice';
export type { LobbyState } from './slices/lobbySlice';

interface RenderEventHandler {
  handleRenderEvent: (event: RenderEvent) => void;
}

type WorldState = LobsterSlice & DialogueSlice & LobbySlice & TaskSlice & UiSlice & RenderEventHandler;

export const useWorldStore = create<WorldState>((...a) => {
  const [set, get] = a;

  return {
    ...createLobsterSlice(...a),
    ...createDialogueSlice(...a),
    ...createLobbySlice(...a),
    ...createTaskSlice(...a),
    ...createUiSlice(...a),

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
          const entrancePos: Vec3 = { x: 0, y: 0, z: -10 };
          const targetPos = event.lobster.position;

          const lobsterAtEntrance: LobsterState = {
            ...event.lobster,
            position: entrancePos,
            animation: 'walking',
          };

          const effectId = nextEffectId();
          set((state) => {
            const lobsters = { ...state.lobsters, [event.lobster.id]: lobsterAtEntrance };
            const newEffect: EffectEntry = {
              id: effectId,
              position: entrancePos,
              type: 'confetti',
              startTime: Date.now(),
            };
            return {
              lobsters,
              stats: { ...state.stats, lobsterCount: Object.keys(lobsters).length },
              effects: [...state.effects, newEffect],
              entranceAnimations: {
                ...state.entranceAnimations,
                [event.lobster.id]: { targetPos, startTime: Date.now() },
              },
            };
          });
          setTimeout(() => get().removeEffect(effectId), 3000);
          playJoinSound();
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

            const lobsterStats = { ...state.lobsterStats };
            for (const pid of event.participants) {
              const existing = lobsterStats[pid] ?? { messagesSent: 0, dialoguesParticipated: 0 };
              lobsterStats[pid] = { ...existing, dialoguesParticipated: existing.dialoguesParticipated + 1 };
            }

            const l1 = state.lobsters[event.participants[0]];
            const l2 = state.lobsters[event.participants[1]];
            let newEffects = state.effects;
            if (l1 && l2) {
              const effectId = nextEffectId();
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
          playChatPing();
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
          const effectId = nextEffectId();
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
        case 'task_update': {
          set((state) => ({
            tasks: { ...state.tasks, [event.task.id]: event.task },
          }));
          break;
        }
        case 'task_card_move': {
          const anim: TaskCardAnimation = {
            taskId: event.taskId,
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
            startTime: Date.now(),
          };
          set((state) => {
            const task = state.tasks[event.taskId];
            const updatedTasks = task
              ? { ...state.tasks, [event.taskId]: { ...task, status: event.toStatus, assigneeId: event.assigneeId ?? task.assigneeId } }
              : state.tasks;
            return {
              tasks: updatedTasks,
              taskAnimations: [...state.taskAnimations, anim],
            };
          });
          setTimeout(() => get().removeTaskAnimation(event.taskId), 1500);
          break;
        }
        case 'meeting_start': {
          set((state) => ({
            meetings: { ...state.meetings, [event.meeting.id]: event.meeting },
          }));
          break;
        }
        case 'meeting_end': {
          set((state) => {
            const meeting = state.meetings[event.meetingId];
            if (!meeting) return state;
            return {
              meetings: {
                ...state.meetings,
                [event.meetingId]: { ...meeting, status: 'ended' as const },
              },
            };
          });
          break;
        }
        case 'platform_event': {
          set((state) => ({
            platformEvents: [...state.platformEvents.slice(-49), event.event],
          }));
          break;
        }
        case 'team_sync': {
          set({ teamAgents: event.agents });
          break;
        }
        case 'permission_request': {
          set((state) => ({
            permissionRequests: [...state.permissionRequests, event.request],
          }));
          setTimeout(() => get().resolvePermissionRequest(event.request.id), PERMISSION_AUTO_DISMISS_MS);
          break;
        }
        case 'budget_status': {
          set({ budgetStatus: event.status });
          break;
        }
      }
    },
  };
});
