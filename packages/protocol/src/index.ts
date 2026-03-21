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

// --- Role Types ---

export interface AgentRole {
  id: string;
  name: string;
  icon: string;
  color: string;
  responsibilities: string[];
  behaviorWeights: {
    coding: number;
    meeting: number;
    reviewing: number;
    socializing: number;
  };
}

export const PRESET_ROLES: AgentRole[] = [
  {
    id: 'pm',
    name: 'Product Manager',
    icon: '📋',
    color: '#3B82F6',
    responsibilities: ['create tasks', 'prioritize backlog', 'run standups'],
    behaviorWeights: { coding: 0.0, meeting: 0.5, reviewing: 0.3, socializing: 0.2 },
  },
  {
    id: 'tech-lead',
    name: 'Tech Lead',
    icon: '🏗️',
    color: '#8B5CF6',
    responsibilities: ['review code', 'assign tasks', 'architecture decisions'],
    behaviorWeights: { coding: 0.3, meeting: 0.3, reviewing: 0.3, socializing: 0.1 },
  },
  {
    id: 'frontend-dev',
    name: 'Frontend Dev',
    icon: '🎨',
    color: '#EC4899',
    responsibilities: ['build UI', 'implement features', 'fix bugs'],
    behaviorWeights: { coding: 0.7, meeting: 0.1, reviewing: 0.1, socializing: 0.1 },
  },
  {
    id: 'backend-dev',
    name: 'Backend Dev',
    icon: '⚙️',
    color: '#10B981',
    responsibilities: ['build APIs', 'database work', 'server logic'],
    behaviorWeights: { coding: 0.7, meeting: 0.1, reviewing: 0.1, socializing: 0.1 },
  },
  {
    id: 'qa',
    name: 'QA Engineer',
    icon: '🔍',
    color: '#F59E0B',
    responsibilities: ['write tests', 'find bugs', 'verify fixes'],
    behaviorWeights: { coding: 0.4, meeting: 0.1, reviewing: 0.4, socializing: 0.1 },
  },
  {
    id: 'devops',
    name: 'DevOps',
    icon: '🚀',
    color: '#EF4444',
    responsibilities: ['CI/CD pipelines', 'deployments', 'monitoring'],
    behaviorWeights: { coding: 0.4, meeting: 0.1, reviewing: 0.2, socializing: 0.3 },
  },
  {
    id: 'tech-writer',
    name: 'Tech Writer',
    icon: '✍️',
    color: '#6366F1',
    responsibilities: ['documentation', 'API docs', 'guides'],
    behaviorWeights: { coding: 0.2, meeting: 0.2, reviewing: 0.3, socializing: 0.3 },
  },
];

// --- Task Types ---

export type TaskStatus = 'todo' | 'doing' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  createdBy: string;
  subtasks: string[];
  createdAt: number;
  updatedAt: number;
}

// --- Agent Communication Types ---

export type MessageType = 'direct' | 'broadcast' | 'meeting' | 'async' | 'review';

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'all';
  type: MessageType;
  context?: { taskId?: string; docId?: string };
  content: string;
  timestamp: number;
}

export interface Meeting {
  id: string;
  topic: string;
  participants: string[];
  messages: AgentMessage[];
  decisions: string[];
  status: 'active' | 'ended';
}

// --- Platform Event Types ---

export type PlatformEventSource = 'internal' | 'github' | 'linear' | 'notion' | 'slack';

export interface PlatformEvent {
  id: string;
  source: PlatformEventSource;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  processedBy?: string;
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
  | { type: 'effect'; position: Vec3; effectType: string }
  | { type: 'task_update'; task: Task }
  | { type: 'task_card_move'; taskId: string; fromStatus: TaskStatus; toStatus: TaskStatus; assigneeId?: string }
  | { type: 'meeting_start'; meeting: Meeting }
  | { type: 'meeting_end'; meetingId: string }
  | { type: 'platform_event'; event: PlatformEvent }
  | { type: 'team_sync'; agents: Array<{ id: string; roleId: string; name: string; color: string }> };

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

export const DEFAULT_SOCIAL_PERMISSION_POLICY: SocialPermissionPolicy = {
  allowProtectedAccess: [],
  autoAcceptDialogue: [],
  blockList: [],
  maxConcurrentDialogues: 3,
};

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

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  daily: { maxTokens: 50000, maxSessions: 20 },
  perSession: { maxTokens: 5000, maxTurns: 20 },
};

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
  | { type: 'budget_warning'; level: 'warning' | 'critical'; tokensUsed: number; tokensLimit: number; sessionsUsed: number; sessionsLimit: number };

// --- Budget Warning Thresholds ---

export const BUDGET_WARNING_THRESHOLD = 0.8;
export const BUDGET_CRITICAL_THRESHOLD = 0.95;
export const DIALOGUE_CONSENT_TIMEOUT_MS = 30000;

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

// Task constants
export const MAX_TASKS_PER_PROJECT = 100;

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#22c55e',
  medium: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
};

export const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['doing', 'done'],
  doing: ['todo', 'review'],
  review: ['doing', 'done'],
  done: ['review'],
};

// Role-based desk layout positions (x, z)
export const ROLE_DESK_POSITIONS: Record<string, { x: number; z: number }> = {
  pm: { x: -3, z: -5 },
  'tech-lead': { x: 0, z: -5 },
  'frontend-dev': { x: -3, z: 0 },
  'backend-dev': { x: 0, z: 0 },
  qa: { x: 3, z: 0 },
  devops: { x: 6, z: -3 },
  'tech-writer': { x: -6, z: 0 },
};

// Meeting room position
export const MEETING_ROOM_POSITION: Vec3 = { x: -6, y: 0, z: -5 };

// Kanban wall position
export const KANBAN_WALL_POSITION: Vec3 = { x: 0, y: 0, z: -8 };

// Server rack position
export const SERVER_RACK_POSITION: Vec3 = { x: 7, y: 0, z: -5 };

// Mock scenario timing
export const MOCK_SCENARIO_TICK_MS = 8000;
export const MOCK_SCENARIO_INITIAL_DELAY_MS = 5000;
