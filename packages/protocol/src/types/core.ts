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

export type LobsterSource = 'demo' | 'plugin' | 'api';

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
  source?: LobsterSource;
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

// --- Audit Types ---

export type AuditEventType =
  | 'lobster_join'
  | 'lobster_leave'
  | 'dialogue_start'
  | 'dialogue_message'
  | 'dialogue_end'
  | 'circuit_breaker_triggered'
  | 'encrypted_dialogue'
  | 'key_exchange';

export interface AuditEvent {
  timestamp: number;
  eventType: AuditEventType;
  participants: string[];
  details: string;
}

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
