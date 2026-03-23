import {
  RECONNECT_INITIAL_DELAY_MS,
  RECONNECT_MAX_BACKOFF_MS,
  RECONNECT_BACKOFF_MULTIPLIER,
  PLUGIN_HEARTBEAT_INTERVAL_MS,
  PLUGIN_PING_TIMEOUT_MS,
  BIO_MAX_LENGTH,
} from '@lobster-world/protocol';

// Re-export protocol constants used by the plugin
export {
  RECONNECT_INITIAL_DELAY_MS,
  RECONNECT_MAX_BACKOFF_MS,
  RECONNECT_BACKOFF_MULTIPLIER,
  PLUGIN_HEARTBEAT_INTERVAL_MS,
  PLUGIN_PING_TIMEOUT_MS,
  BIO_MAX_LENGTH,
};

// --- Plugin-specific Constants ---

export const DISPLAY_NAME_MAX_LENGTH = 30;
export const DISPLAY_NAME_MIN_LENGTH = 1;

export type ClientState = 'disconnected' | 'connecting' | 'authenticating' | 'joined' | 'reconnecting';

export const STATE_DEBOUNCE_MS = 200;

export const DEFAULT_PLUGIN_CONFIG = {
  permissionPreset: 'selective' as const,
  dailyTokenLimit: 50000,
  sessionTokenLimit: 5000,
  autoConnect: true,
  skills: [] as string[],
  bio: '',
  color: '#3B82F6',
};
