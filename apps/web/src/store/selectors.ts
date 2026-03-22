import { useWorldStore } from './useWorldStore';

// Lobster selectors
export const useLobsters = () => useWorldStore((s) => s.lobsters);
export const useLobsterStats = () => useWorldStore((s) => s.lobsterStats);
export const useEffects = () => useWorldStore((s) => s.effects);
export const useEntranceAnimations = () => useWorldStore((s) => s.entranceAnimations);

// Dialogue selectors
export const useActiveDialogues = () => useWorldStore((s) => s.activeDialogues);
export const useDialogues = () => useWorldStore((s) => s.dialogues);

// Lobby selectors
export const useLobbyState = () => useWorldStore((s) => s.lobbyState);
export const usePermissionRequests = () => useWorldStore((s) => s.permissionRequests);
export const useBudgetStatus = () => useWorldStore((s) => s.budgetStatus);

// Task selectors
export const useTasks = () => useWorldStore((s) => s.tasks);
export const useMeetings = () => useWorldStore((s) => s.meetings);
export const useTeamAgents = () => useWorldStore((s) => s.teamAgents);
export const usePlatformEvents = () => useWorldStore((s) => s.platformEvents);
export const useTaskAnimations = () => useWorldStore((s) => s.taskAnimations);

// UI selectors
export const useConnectionStatus = () => useWorldStore((s) => s.connectionStatus);
export const useStats = () => useWorldStore((s) => s.stats);
export const useFocusLobsterId = () => useWorldStore((s) => s.focusLobsterId);
export const useSelectedLobsterId = () => useWorldStore((s) => s.selectedLobsterId);
export const useSelectedTaskId = () => useWorldStore((s) => s.selectedTaskId);
