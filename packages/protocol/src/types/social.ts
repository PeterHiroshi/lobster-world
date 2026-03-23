import type { StatusType, LobsterState, Scene, LobsterSource } from './core.js';

// --- Dialogue Type (shared with dialogue.ts) ---

export type DialogueType = 'social' | 'collab' | 'trade';

// --- Data Partition Types (Phase 2b — Social Proxy) ---

export type DataPartition = 'private' | 'protected' | 'public';

export interface SocialProfile {
  lobsterId: string;
  displayName: string;
  avatar: string;
  bio: string;
  skillTags: string[];
  personalitySnippet: string;
  status: StatusType;
  partition: DataPartition;
}

export interface SocialPermissionPolicy {
  allowProtectedAccess: string[];
  autoAcceptDialogue: string[];
  blockList: string[];
  maxConcurrentDialogues: number;
}

export interface BudgetConfig {
  daily: {
    maxTokens: number;
    maxSessions: number;
  };
  perSession: {
    maxTokens: number;
    maxTurns: number;
  };
}

export interface BudgetUsage {
  daily: {
    tokensUsed: number;
    sessionsUsed: number;
    resetAt: number;
  };
  sessions: Map<string, {
    tokensUsed: number;
    turnsUsed: number;
    startedAt: number;
  }>;
}

// --- Output Filter ---

export interface OutputFilterResult {
  allowed: boolean;
  reason?: string;
}

// --- Crypto Auth Types (Phase 2b) ---

export interface AuthChallenge {
  nonce: string;
  timestamp: number;
}

export interface AuthResponse {
  lobsterId: string;
  publicKey: string; // hex-encoded
  signature: string; // hex-encoded
}

export interface DialogueInvitation {
  sessionId: string;
  from: {
    lobsterId: string;
    profile: SocialProfile;
  };
  intent: string;
  type: DialogueType;
}

export interface DialogueConsentResponse {
  sessionId: string;
  accepted: boolean;
  reason?: string;
}

// --- Social Proxy Protocol Events (Phase 2b) ---

export interface LobbyJoinRequest {
  auth: AuthResponse;
  profile: SocialProfile;
  budgetConfig: BudgetConfig;
  permissions: SocialPermissionPolicy;
}

export interface LobbyJoinResult {
  success: boolean;
  reason?: string;
  sessionToken?: string;
  scene?: Scene;
}

export type SocialProxyUpstream =
  | { type: 'lobby_join'; request: LobbyJoinRequest }
  | { type: 'dialogue_response'; response: DialogueConsentResponse }
  | { type: 'dialogue_message'; sessionId: string; content: string }
  | { type: 'state_update'; state: Partial<LobsterState> }
  | { type: 'budget_report'; usage: { daily: { tokensUsed: number; sessionsUsed: number }; session?: { sessionId: string; tokensUsed: number; turnsUsed: number } } };

export type SocialProxyDownstream =
  | { type: 'lobby_result'; result: LobbyJoinResult }
  | { type: 'dialogue_invitation'; invitation: DialogueInvitation }
  | { type: 'dialogue_message'; sessionId: string; from: string; content: string; turnNumber: number }
  | { type: 'dialogue_ended'; sessionId: string; reason: string }
  | { type: 'auth_challenge'; challenge: AuthChallenge }
  | { type: 'budget_warning'; level: 'warning' | 'critical'; tokensUsed: number; tokensLimit: number; sessionsUsed: number; sessionsLimit: number }
  | { type: 'reconnect_resume'; lobsterId: string; scene: Scene; activeSessions: string[] };

// --- World Snapshot (REST API response) ---

export interface WorldSnapshot {
  sceneId: string;
  sceneName: string;
  lobsters: Array<{
    id: string;
    displayName: string;
    color: string;
    status: StatusType;
    activity?: string;
    source: LobsterSource;
    position: { x: number; y: number; z: number };
  }>;
  activeDialogues: number;
  totalConnections: number;
  timestamp: number;
}
