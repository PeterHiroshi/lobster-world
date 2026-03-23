import type { StateCreator } from 'zustand';
import type { DialogueSession } from '@lobster-world/protocol';

export interface DialogueMessageEntry {
  fromId: string;
  fromName: string;
  fromColor: string;
  content: string;
  turnNumber: number;
  timestamp: number;
  encrypted?: boolean;
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
  encrypted?: boolean;
}

export interface DialogueSlice {
  dialogues: DialogueSession[];
  activeDialogues: Record<string, ActiveDialogue>;
}

export const createDialogueSlice: StateCreator<DialogueSlice, [], [], DialogueSlice> = () => ({
  dialogues: [],
  activeDialogues: {},
});
