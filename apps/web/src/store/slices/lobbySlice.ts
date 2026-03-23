import type { StateCreator } from 'zustand';
import type {
  LobbyPhase,
  LobbyProfile,
  PermissionRequest,
  BudgetStatus,
} from '@lobster-world/protocol';
import { PERMISSION_AUTO_DISMISS_MS } from '@lobster-world/protocol';

export interface LobbyState {
  phase: LobbyPhase;
  profile: LobbyProfile | null;
  sessionToken: string | null;
  error: string | null;
}

export interface LobbySlice {
  lobbyState: LobbyState;
  permissionRequests: PermissionRequest[];
  budgetStatus: BudgetStatus | null;

  setLobbyPhase: (phase: LobbyPhase) => void;
  setLobbyProfile: (profile: LobbyProfile) => void;
  setLobbyError: (error: string | null) => void;
  setSessionToken: (token: string) => void;
  addPermissionRequest: (request: PermissionRequest) => void;
  resolvePermissionRequest: (id: string) => void;
  setBudgetStatus: (status: BudgetStatus) => void;
}

export const createLobbySlice: StateCreator<LobbySlice, [], [], LobbySlice> = (set, get) => ({
  lobbyState: { phase: 'landing', profile: null, sessionToken: null, error: null },
  permissionRequests: [],
  budgetStatus: null,

  setLobbyPhase: (phase: LobbyPhase) => {
    set((state) => ({
      lobbyState: { ...state.lobbyState, phase, error: null },
    }));
  },

  setLobbyProfile: (profile: LobbyProfile) => {
    set((state) => ({
      lobbyState: { ...state.lobbyState, profile },
    }));
  },

  setLobbyError: (error: string | null) => {
    set((state) => ({
      lobbyState: { ...state.lobbyState, error, phase: error ? 'lobby' : state.lobbyState.phase },
    }));
  },

  setSessionToken: (token: string) => {
    set((state) => ({
      lobbyState: { ...state.lobbyState, sessionToken: token, phase: 'joined' },
    }));
  },

  addPermissionRequest: (request: PermissionRequest) => {
    set((state) => ({
      permissionRequests: [...state.permissionRequests, request],
    }));
    setTimeout(() => get().resolvePermissionRequest(request.id), PERMISSION_AUTO_DISMISS_MS);
  },

  resolvePermissionRequest: (id: string) => {
    set((state) => ({
      permissionRequests: state.permissionRequests.filter((r) => r.id !== id),
    }));
  },

  setBudgetStatus: (status: BudgetStatus) => {
    set({ budgetStatus: status });
  },
});
