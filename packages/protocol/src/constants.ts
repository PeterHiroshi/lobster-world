import type { CircuitBreakerConfig, BudgetPolicy, Vec3 } from './types/core.js';
import type { AgentRole, TaskPriority, TaskStatus } from './types/workforce.js';
import type { SocialPermissionPolicy, BudgetConfig } from './types/social.js';
import type { SkillTag } from './types/lobby.js';

// --- Default Configs ---

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

export const DEFAULT_SOCIAL_PERMISSION_POLICY: SocialPermissionPolicy = {
  allowProtectedAccess: [],
  autoAcceptDialogue: [],
  blockList: [],
  maxConcurrentDialogues: 3,
};

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  daily: { maxTokens: 50000, maxSessions: 20 },
  perSession: { maxTokens: 5000, maxTurns: 20 },
};

// --- Interval / Size Constants ---

export const SCENE_UPDATE_INTERVAL_MS = 100;
export const HEARTBEAT_INTERVAL_MS = 30000;
export const MAX_LOBSTERS_PER_SCENE = 50;
export const AUDIT_RING_BUFFER_SIZE = 1000;
export const MOCK_DIALOGUE_INTERVAL_MIN_MS = 30000;
export const MOCK_DIALOGUE_INTERVAL_MAX_MS = 60000;

// --- Task Constants ---

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

// --- Role Constants ---

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

// --- Layout Positions ---

export const ROLE_DESK_POSITIONS: Record<string, { x: number; z: number }> = {
  pm: { x: -3, z: -5 },
  'tech-lead': { x: 0, z: -5 },
  'frontend-dev': { x: -3, z: 0 },
  'backend-dev': { x: 0, z: 0 },
  qa: { x: 3, z: 0 },
  devops: { x: 6, z: -3 },
  'tech-writer': { x: -6, z: 0 },
};

export const MEETING_ROOM_POSITION: Vec3 = { x: -6, y: 0, z: -5 };
export const KANBAN_WALL_POSITION: Vec3 = { x: 0, y: 0, z: -8 };
export const SERVER_RACK_POSITION: Vec3 = { x: 7, y: 0, z: -5 };

// --- Mock Scenario Timing ---

export const MOCK_SCENARIO_TICK_MS = 8000;
export const MOCK_SCENARIO_INITIAL_DELAY_MS = 5000;

// --- Lobby Constants ---

export const LOBBY_PRESET_COLORS: string[] = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4',
  '#10B981', '#F43F5E',
];

export const LOBBY_SKILL_TAGS: SkillTag[] = [
  'coding', 'design', 'devops', 'testing', 'writing', 'research',
];

export const PERMISSION_AUTO_DISMISS_MS = 30000;
export const BIO_MAX_LENGTH = 140;
export const BUDGET_DAILY_MIN = 1000;
export const BUDGET_DAILY_MAX = 100000;
export const BUDGET_SESSION_MIN = 100;
export const BUDGET_SESSION_MAX = 10000;
export const DEMO_NPC_DELAY_MS = 10000;

// --- Budget Warning Thresholds ---

export const BUDGET_WARNING_THRESHOLD = 0.8;
export const BUDGET_CRITICAL_THRESHOLD = 0.95;
export const DIALOGUE_CONSENT_TIMEOUT_MS = 30000;

// --- API Constants ---

export const API_RATE_LIMIT_PER_MIN = 100;
export const RECONNECT_INITIAL_DELAY_MS = 1000;
export const RECONNECT_MAX_BACKOFF_MS = 60000;
export const RECONNECT_BACKOFF_MULTIPLIER = 2;
export const PLUGIN_HEARTBEAT_INTERVAL_MS = 30000;
export const PLUGIN_PING_TIMEOUT_MS = 10000;
