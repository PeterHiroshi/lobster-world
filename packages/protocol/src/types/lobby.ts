// --- Lobby UI Types (Phase 2b Part 2) ---

export type LobbyPhase = 'lobby' | 'joining' | 'joined';

export type SkillTag = 'coding' | 'design' | 'devops' | 'testing' | 'writing' | 'research';

export type PermissionPreset = 'open' | 'selective' | 'private';

export interface LobbyProfile {
  displayName: string;
  color: string;
  bio: string;
  skills: SkillTag[];
  dailyTokenLimit: number;
  sessionTokenLimit: number;
  permissionPreset: PermissionPreset;
}

export interface PermissionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterColor: string;
  dataType: string;
  timestamp: number;
}

export interface BudgetStatus {
  dailyTokensUsed: number;
  dailyTokensLimit: number;
  dailySessionsUsed: number;
  dailySessionsLimit: number;
  activeSessionTokens: number;
  activeSessionLimit: number;
}
