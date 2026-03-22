import type { StateCreator } from 'zustand';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WorldStats {
  lobsterCount: number;
  activeDialogues: number;
  totalMessages: number;
}

export interface UiSlice {
  connectionStatus: ConnectionStatus;
  stats: WorldStats;
  focusLobsterId: string | null;
  selectedLobsterId: string | null;
  selectedTaskId: string | null;

  setConnectionStatus: (status: ConnectionStatus) => void;
  setFocusLobster: (id: string | null) => void;
  setSelectedLobster: (id: string | null) => void;
  setSelectedTask: (id: string | null) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  connectionStatus: 'disconnected',
  stats: { lobsterCount: 0, activeDialogues: 0, totalMessages: 0 },
  focusLobsterId: null,
  selectedLobsterId: null,
  selectedTaskId: null,

  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  setFocusLobster: (id: string | null) => {
    set({ focusLobsterId: id });
  },

  setSelectedLobster: (id: string | null) => {
    set({ selectedLobsterId: id });
  },

  setSelectedTask: (id: string | null) => {
    set({ selectedTaskId: id });
  },
});
