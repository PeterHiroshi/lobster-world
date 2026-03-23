import {
  DEFAULT_CIRCUIT_BREAKER,
  SCENE_UPDATE_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  MAX_LOBSTERS_PER_SCENE as PROTOCOL_MAX_LOBSTERS,
  AUDIT_RING_BUFFER_SIZE,
  MOCK_DIALOGUE_INTERVAL_MIN_MS,
  MOCK_DIALOGUE_INTERVAL_MAX_MS,
  WS_MAX_CONNECTIONS as PROTOCOL_WS_MAX_CONNECTIONS,
  WS_BATCH_INTERVAL_MS as PROTOCOL_WS_BATCH_INTERVAL_MS,
  WS_MAX_BATCH_SIZE as PROTOCOL_WS_MAX_BATCH_SIZE,
} from '@lobster-world/protocol';

// Re-export protocol constants for convenience
export {
  DEFAULT_CIRCUIT_BREAKER,
  SCENE_UPDATE_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  AUDIT_RING_BUFFER_SIZE,
  MOCK_DIALOGUE_INTERVAL_MIN_MS,
  MOCK_DIALOGUE_INTERVAL_MAX_MS,
};

// Env-overridable scaling constants (fallback to protocol defaults)
export const MAX_LOBSTERS_PER_SCENE = Number(process.env.MAX_CONCURRENT_LOBSTERS) || PROTOCOL_MAX_LOBSTERS;
export const WS_MAX_CONNECTIONS = Number(process.env.WS_MAX_CONNECTIONS) || PROTOCOL_WS_MAX_CONNECTIONS;
export const WS_BATCH_INTERVAL_MS = Number(process.env.WS_BATCH_INTERVAL_MS) || PROTOCOL_WS_BATCH_INTERVAL_MS;
export const WS_MAX_BATCH_SIZE = Number(process.env.WS_MAX_BATCH_SIZE) || PROTOCOL_WS_MAX_BATCH_SIZE;

// Server-specific constants
export const SERVER_PORT = Number(process.env.PORT) || 3001;
export const SERVER_HOST = process.env.HOST || '0.0.0.0';

// CORS configuration
export function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return ['http://localhost:5173'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const CORS_ORIGINS = parseCorsOrigins();

// WebSocket paths
export const WS_PATH_LOBSTER = '/ws/lobster';
export const WS_PATH_VIEWER = '/ws/viewer';
export const WS_PATH_SOCIAL = '/ws/social';

// Token estimation: word count * this factor
export const TOKEN_ESTIMATION_FACTOR = 1.3;

// Circuit breaker repeat detection
export const REPEAT_HISTORY_LENGTH = 3;
export const CONSECUTIVE_REPEATS_TO_KILL = 3;

// Mock lobster behavior
export const MOCK_BEHAVIOR_MIN_INTERVAL_MS = 5000;
export const MOCK_BEHAVIOR_MAX_INTERVAL_MS = 15000;
export const MOCK_DIALOGUE_MIN_TURNS = 3;
export const MOCK_DIALOGUE_MAX_TURNS = 5;

// Scene defaults
export const DEFAULT_SCENE_ID = 'office-main';
export const DEFAULT_SCENE_NAME = 'Virtual Office';
