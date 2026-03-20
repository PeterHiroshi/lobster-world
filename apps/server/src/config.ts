import {
  DEFAULT_CIRCUIT_BREAKER,
  SCENE_UPDATE_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  MAX_LOBSTERS_PER_SCENE,
} from '@lobster-world/protocol';

// Re-export protocol constants for convenience
export {
  DEFAULT_CIRCUIT_BREAKER,
  SCENE_UPDATE_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  MAX_LOBSTERS_PER_SCENE,
};

// Server-specific constants
export const SERVER_PORT = Number(process.env.PORT) || 3001;
export const SERVER_HOST = process.env.HOST || '0.0.0.0';

// WebSocket paths
export const WS_PATH_LOBSTER = '/ws/lobster';
export const WS_PATH_VIEWER = '/ws/viewer';

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
