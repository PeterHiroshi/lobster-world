import type { StateCreator } from 'zustand';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type Theme = 'dark' | 'light';

export interface WorldStats {
  lobsterCount: number;
  activeDialogues: number;
  totalMessages: number;
}

const THEME_STORAGE_KEY = 'lobster-world-theme';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'dark';
}

function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
}

export interface UiSlice {
  connectionStatus: ConnectionStatus;
  stats: WorldStats;
  focusLobsterId: string | null;
  selectedLobsterId: string | null;
  selectedTaskId: string | null;
  theme: Theme;

  setConnectionStatus: (status: ConnectionStatus) => void;
  setFocusLobster: (id: string | null) => void;
  setSelectedLobster: (id: string | null) => void;
  setSelectedTask: (id: string | null) => void;
  toggleTheme: () => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set, get) => {
  const initialTheme = getInitialTheme();
  applyThemeToDocument(initialTheme);

  return {
    connectionStatus: 'disconnected',
    stats: { lobsterCount: 0, activeDialogues: 0, totalMessages: 0 },
    focusLobsterId: null,
    selectedLobsterId: null,
    selectedTaskId: null,
    theme: initialTheme,

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

    toggleTheme: () => {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
      applyThemeToDocument(next);
      try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* noop */ }
      set({ theme: next });
    },
  };
};
