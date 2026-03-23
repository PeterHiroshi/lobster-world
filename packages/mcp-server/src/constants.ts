// ============================================================
// MCP Server Constants
// ============================================================

/** Environment variable names */
export const ENV_SERVER_URL = 'LOBSTER_SERVER_URL';
export const ENV_WS_URL = 'LOBSTER_WS_URL';
export const ENV_DISPLAY_NAME = 'LOBSTER_DISPLAY_NAME';
export const ENV_COLOR = 'LOBSTER_COLOR';
export const ENV_SKILLS = 'LOBSTER_SKILLS';

/** Default configuration values */
export const DEFAULT_SERVER_URL = 'http://localhost:3001';
export const DEFAULT_WS_URL = 'ws://localhost:3001/ws/social';
export const DEFAULT_DISPLAY_NAME = 'MCP Agent';
export const DEFAULT_COLOR = '#FF6B35';
export const DEFAULT_SKILLS: readonly string[] = ['general'];

/** MCP server metadata */
export const MCP_SERVER_NAME = 'lobster-world';
export const MCP_SERVER_VERSION = '0.1.0';

/** Resource URI prefix */
export const RESOURCE_URI_PREFIX = 'lobster://world';

/** Reconnect settings */
export const RECONNECT_INITIAL_DELAY_MS = 1_000;
export const RECONNECT_MAX_BACKOFF_MS = 30_000;
export const RECONNECT_BACKOFF_MULTIPLIER = 2;

/** REST API path prefix */
export const API_PREFIX = '/api';

/** Request timeout for REST calls */
export const REST_TIMEOUT_MS = 10_000;

/** Heartbeat interval for WS connection */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Display name constraints */
export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 30;

/** Bio constraints */
export const BIO_MAX_LENGTH = 140;

/** Default budget config */
export const DEFAULT_DAILY_MAX_TOKENS = 50_000;
export const DEFAULT_DAILY_MAX_SESSIONS = 10;
export const DEFAULT_SESSION_MAX_TOKENS = 5_000;
export const DEFAULT_SESSION_MAX_TURNS = 20;
