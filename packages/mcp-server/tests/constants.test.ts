import { describe, it, expect } from 'vitest';
import {
  ENV_SERVER_URL,
  ENV_WS_URL,
  ENV_DISPLAY_NAME,
  ENV_COLOR,
  ENV_SKILLS,
  DEFAULT_SERVER_URL,
  DEFAULT_WS_URL,
  DEFAULT_DISPLAY_NAME,
  DEFAULT_COLOR,
  DEFAULT_SKILLS,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  RESOURCE_URI_PREFIX,
  RECONNECT_INITIAL_DELAY_MS,
  RECONNECT_MAX_BACKOFF_MS,
  RECONNECT_BACKOFF_MULTIPLIER,
  API_PREFIX,
  REST_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  DISPLAY_NAME_MIN_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  DEFAULT_DAILY_MAX_TOKENS,
  DEFAULT_DAILY_MAX_SESSIONS,
  DEFAULT_SESSION_MAX_TOKENS,
  DEFAULT_SESSION_MAX_TURNS,
} from '../src/constants.js';

describe('MCP Server Constants', () => {
  it('exports environment variable names as non-empty strings', () => {
    const envVars = [ENV_SERVER_URL, ENV_WS_URL, ENV_DISPLAY_NAME, ENV_COLOR, ENV_SKILLS];
    for (const v of envVars) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it('exports valid default URLs', () => {
    expect(DEFAULT_SERVER_URL).toMatch(/^https?:\/\//);
    expect(DEFAULT_WS_URL).toMatch(/^wss?:\/\//);
  });

  it('exports valid default display name and color', () => {
    expect(DEFAULT_DISPLAY_NAME.length).toBeGreaterThanOrEqual(DISPLAY_NAME_MIN_LENGTH);
    expect(DEFAULT_DISPLAY_NAME.length).toBeLessThanOrEqual(DISPLAY_NAME_MAX_LENGTH);
    expect(DEFAULT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('exports default skills as a non-empty array', () => {
    expect(Array.isArray(DEFAULT_SKILLS)).toBe(true);
    expect(DEFAULT_SKILLS.length).toBeGreaterThan(0);
  });

  it('exports valid MCP server metadata', () => {
    expect(MCP_SERVER_NAME).toBe('lobster-world');
    expect(MCP_SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('exports resource URI prefix with lobster:// scheme', () => {
    expect(RESOURCE_URI_PREFIX).toMatch(/^lobster:\/\//);
  });

  it('exports positive reconnect values', () => {
    expect(RECONNECT_INITIAL_DELAY_MS).toBeGreaterThan(0);
    expect(RECONNECT_MAX_BACKOFF_MS).toBeGreaterThan(RECONNECT_INITIAL_DELAY_MS);
    expect(RECONNECT_BACKOFF_MULTIPLIER).toBeGreaterThan(1);
  });

  it('exports valid API prefix', () => {
    expect(API_PREFIX).toBe('/api');
  });

  it('exports positive timeout and interval values', () => {
    expect(REST_TIMEOUT_MS).toBeGreaterThan(0);
    expect(HEARTBEAT_INTERVAL_MS).toBeGreaterThan(0);
  });

  it('exports valid display name constraints', () => {
    expect(DISPLAY_NAME_MIN_LENGTH).toBe(1);
    expect(DISPLAY_NAME_MAX_LENGTH).toBeGreaterThan(DISPLAY_NAME_MIN_LENGTH);
  });

  it('exports valid bio constraint', () => {
    expect(BIO_MAX_LENGTH).toBeGreaterThan(0);
  });

  it('exports valid budget defaults', () => {
    expect(DEFAULT_DAILY_MAX_TOKENS).toBeGreaterThan(0);
    expect(DEFAULT_DAILY_MAX_SESSIONS).toBeGreaterThan(0);
    expect(DEFAULT_SESSION_MAX_TOKENS).toBeGreaterThan(0);
    expect(DEFAULT_SESSION_MAX_TURNS).toBeGreaterThan(0);
    expect(DEFAULT_DAILY_MAX_TOKENS).toBeGreaterThan(DEFAULT_SESSION_MAX_TOKENS);
  });
});
