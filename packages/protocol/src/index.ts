// ============================================================
// Lobster Protocol — Shared Types & Constants
// ============================================================

// --- Basic Types ---

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// --- Lobster Types ---

export type AnimationType =
  | 'idle'
  | 'walking'
  | 'working'
  | 'chatting'
  | 'sleeping'
  | 'waving'
  | 'thinking'
  | 'celebrating';

export type StatusType = 'online' | 'busy' | 'away' | 'dnd' | 'offline';

export type MoodType = 'happy' | 'focused' | 'tired' | 'excited' | 'neutral';

export type EmoteType =
  | 'wave'
  | 'thumbsup'
  | 'laugh'
  | 'think'
  | 'shrug'
  | 'clap'
  | 'dance';

export interface PublicProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  skills: string[];
  bio?: string;
}

export interface LobsterState {
  id: string;
  profile: PublicProfile;
  position: Vec3;
  rotation: number;
  animation: AnimationType;
  status: StatusType;
  activity?: string;
  mood: MoodType;
  bubbleText?: string;
}

// --- Scene Types ---

export type SceneType = 'office' | 'cafe' | 'park' | 'workshop' | 'custom';

export interface SceneObject {
  id: string;
  type: string; // 'desk' | 'computer' | 'whiteboard' | 'couch' | etc.
  position: Vec3;
  rotation: number;
  interactable: boolean;
}

export interface Scene {
  id: string;
  name: string;
  type: SceneType;
  capacity: number;
  lobsters: Record<string, LobsterState>;
  objects: SceneObject[];
}

// --- Dialogue Types ---

export type DialogueType = 'social' | 'collab' | 'trade';

export type DialogueStatus = 'active' | 'paused' | 'ended' | 'killed';

export interface DialogueSession {
  id: string;
  participants: string[];
  type: DialogueType;
  intent: string;
  turnBudget: number;
  turnsUsed: number;
  tokenBudget: number;
  tokensUsed: number;
  startedAt: number;
  lastActivityAt: number;
  status: DialogueStatus;
}

export interface DialogueMessage {
  sessionId: string;
  fromId: string;
  content: string;
  timestamp: number;
  turnNumber: number;
}

export interface SessionStats {
  totalTurns: number;
  totalTokens: number;
  duration: number;
  endReason: 'completed' | 'budget_exceeded' | 'circuit_breaker' | 'user_ended' | 'timeout';
}

// --- Audit Types ---

export type AuditEventType =
  | 'lobster_join'
  | 'lobster_leave'
  | 'dialogue_start'
  | 'dialogue_message'
  | 'dialogue_end'
  | 'circuit_breaker_triggered';

export interface AuditEvent {
  timestamp: number;
  eventType: AuditEventType;
  participants: string[];
  details: string;
}

// --- Protocol Events ---

// Upstream: Lobster (Social Proxy) → Platform
export type UpstreamEvent =
  | { type: 'register'; profile: PublicProfile; token: string }
  | { type: 'heartbeat' }
  | { type: 'state_update'; state: Partial<LobsterState> }
  | { type: 'activity_update'; activity: string; mood?: MoodType }
  | { type: 'dialogue_request'; targetId: string; intent: string; dialogueType: DialogueType }
  | { type: 'dialogue_message'; sessionId: string; content: string }
  | { type: 'dialogue_end'; sessionId: string; reason: string }
  | { type: 'dialogue_accept'; sessionId: string }
  | { type: 'dialogue_reject'; sessionId: string; reason?: string }
  | { type: 'emote'; emote: EmoteType };

// Downstream: Platform → Lobster (Social Proxy)
export type DownstreamEvent =
  | { type: 'registered'; lobsterId: string; scene: Scene }
  | { type: 'scene_state'; lobsters: LobsterState[]; delta: boolean }
  | { type: 'dialogue_invite'; sessionId: string; from: PublicProfile; intent: string; dialogueType: DialogueType }
  | { type: 'dialogue_message'; sessionId: string; from: string; content: string; turnNumber: number }
  | { type: 'dialogue_ended'; sessionId: string; reason: string; stats: SessionStats }
  | { type: 'budget_warning'; remaining: number; limit: number }
  | { type: 'system_notice'; message: string }
  | { type: 'error'; code: string; message: string };

// Render: Platform → Frontend
export type RenderEvent =
  | { type: 'full_sync'; scene: Scene }
  | { type: 'lobster_join'; lobster: LobsterState }
  | { type: 'lobster_leave'; lobsterId: string }
  | { type: 'lobster_update'; lobsterId: string; delta: Partial<LobsterState> }
  | { type: 'dialogue_bubble'; lobsterIds: string[]; preview?: string }
  | { type: 'dialogue_start'; sessionId: string; participants: string[]; participantNames: string[]; participantColors: string[]; intent: string }
  | { type: 'dialogue_msg'; sessionId: string; fromId: string; fromName: string; fromColor: string; content: string; turnNumber: number }
  | { type: 'dialogue_end'; sessionId: string; reason: string }
  | { type: 'effect'; position: Vec3; effectType: string };

// --- Safety / Budget Types ---

export interface CircuitBreakerConfig {
  maxTurnsPerSession: number;
  maxTokensPerSession: number;
  maxSessionDurationMs: number;
  semanticRepeatThreshold: number;
  maxConcurrentSessions: number;
  cooldownAfterKillMs: number;
}

export interface BudgetPolicy {
  daily: {
    maxTokens: number;
    maxSessions: number;
  };
  perSession: {
    maxTokens: number;
    maxTurns: number;
  };
}

// --- Permission Types ---

export type SocialMode = 'open' | 'selective' | 'invite-only';
export type DataVisibility = 'public' | 'on-request' | 'private';

export interface PermissionPolicy {
  socialMode: SocialMode;
  autoAccept: {
    trustedList: string[];
    intents: string[];
    maxConcurrent: number;
  };
  autoReject: {
    blockedList: string[];
    lowReputation: boolean;
  };
  dataSharing: {
    skills: DataVisibility;
    timezone: DataVisibility;
    activity: DataVisibility;
  };
}

// --- Constants ---

export const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  maxTurnsPerSession: 20,
  maxTokensPerSession: 10000,
  maxSessionDurationMs: 10 * 60 * 1000, // 10 min
  semanticRepeatThreshold: 0.9,
  maxConcurrentSessions: 3,
  cooldownAfterKillMs: 5 * 60 * 1000, // 5 min
};

export const DEFAULT_BUDGET: BudgetPolicy = {
  daily: { maxTokens: 50000, maxSessions: 20 },
  perSession: { maxTokens: 5000, maxTurns: 20 },
};

export const SCENE_UPDATE_INTERVAL_MS = 100;
export const HEARTBEAT_INTERVAL_MS = 30000;
export const MAX_LOBSTERS_PER_SCENE = 50;
export const AUDIT_RING_BUFFER_SIZE = 1000;
export const MOCK_DIALOGUE_INTERVAL_MIN_MS = 30000;
export const MOCK_DIALOGUE_INTERVAL_MAX_MS = 60000;
