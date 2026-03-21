// WebSocket
export const WS_VIEWER_URL = 'ws://localhost:3001/ws/viewer';
export const WS_SOCIAL_URL = 'ws://localhost:3001/ws/social';
export const API_BASE_URL = 'http://localhost:3001/api';

// Reconnect
export const RECONNECT_BASE_DELAY_MS = 1000;
export const RECONNECT_MAX_RETRIES = 5;

// Animation
export const POSITION_LERP_FACTOR = 0.05;
export const IDLE_BOB_AMPLITUDE = 0.05;
export const IDLE_BOB_SPEED = 2;
export const BREATHING_SPEED = 0.5;
export const CLAW_OSCILLATION_SPEED = 12;
export const ENTER_EXIT_SCALE_SPEED = 0.08;

// UI
export const BUBBLE_TIMEOUT_MS = 5000;

// Camera
export const CAMERA_INITIAL_POSITION: [number, number, number] = [8, 8, 8];
export const CAMERA_LOOK_AT: [number, number, number] = [0, 0, 0];
export const CAMERA_FOCUS_OFFSET: [number, number, number] = [2, 2, 2];
export const CAMERA_LERP_FACTOR = 0.03;

// Scene
export const FLOOR_SIZE = 24;
export const DESK_POSITIONS: [number, number][] = [
  [-3, -2], [0, -2], [3, -2],
  [-3, 2], [0, 2], [3, 2],
];
export const COFFEE_AREA_POSITION: [number, number] = [6, 3];

// Task card animation
export const TASK_CARD_ANIMATION_DURATION_MS = 1500;

// Task status badge colors
export const TASK_STATUS_COLORS: Record<string, string> = {
  todo: '#94a3b8',
  doing: '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
};

// Lobster
export const LOBSTER_SCALE = 0.5;
export const LEG_PAIRS = 4;
export const LEG_RADIUS = 0.012;
export const LEG_LENGTH = 0.1;
export const LEG_SPACING = 0.06;
export const PUPIL_TRACK_FACTOR = 0.015;
export const BODY_SEGMENTS_CAP = 16;
export const BODY_SEGMENTS_RADIAL = 32;

// Entrance animation
export const ENTRANCE_POSITION: [number, number, number] = [0, 0, -10];
export const ENTRANCE_WALK_SPEED = 0.03;


// Status colors
export const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  busy: '#eab308',
  away: '#9ca3af',
  dnd: '#ef4444',
  offline: '#6b7280',
};
