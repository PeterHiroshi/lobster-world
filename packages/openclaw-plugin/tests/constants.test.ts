import { describe, it, expect } from 'vitest';
import {
  RECONNECT_INITIAL_DELAY_MS,
  RECONNECT_MAX_BACKOFF_MS,
  RECONNECT_BACKOFF_MULTIPLIER,
  PLUGIN_HEARTBEAT_INTERVAL_MS,
  PLUGIN_PING_TIMEOUT_MS,
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  STATE_DEBOUNCE_MS,
  DEFAULT_PLUGIN_CONFIG,
} from '../src/constants.js';

describe('Plugin Constants', () => {
  it('exports reconnect timing constants', () => {
    expect(RECONNECT_INITIAL_DELAY_MS).toBe(1000);
    expect(RECONNECT_MAX_BACKOFF_MS).toBe(60000);
    expect(RECONNECT_BACKOFF_MULTIPLIER).toBe(2);
  });

  it('exports heartbeat constants', () => {
    expect(PLUGIN_HEARTBEAT_INTERVAL_MS).toBe(30000);
    expect(PLUGIN_PING_TIMEOUT_MS).toBe(10000);
  });

  it('exports display name constraints', () => {
    expect(DISPLAY_NAME_MAX_LENGTH).toBe(30);
    expect(DISPLAY_NAME_MIN_LENGTH).toBe(1);
  });

  it('exports state debounce timing', () => {
    expect(STATE_DEBOUNCE_MS).toBe(200);
  });

  it('has valid default plugin config', () => {
    expect(DEFAULT_PLUGIN_CONFIG.permissionPreset).toBe('selective');
    expect(DEFAULT_PLUGIN_CONFIG.dailyTokenLimit).toBe(50000);
    expect(DEFAULT_PLUGIN_CONFIG.sessionTokenLimit).toBe(5000);
    expect(DEFAULT_PLUGIN_CONFIG.autoConnect).toBe(true);
    expect(DEFAULT_PLUGIN_CONFIG.skills).toEqual([]);
    expect(DEFAULT_PLUGIN_CONFIG.bio).toBe('');
    expect(DEFAULT_PLUGIN_CONFIG.color).toBe('#3B82F6');
  });

  it('ensures backoff grows exponentially within bounds', () => {
    let delay = RECONNECT_INITIAL_DELAY_MS;
    for (let i = 0; i < 10; i++) {
      expect(delay).toBeLessThanOrEqual(RECONNECT_MAX_BACKOFF_MS);
      delay = Math.min(delay * RECONNECT_BACKOFF_MULTIPLIER, RECONNECT_MAX_BACKOFF_MS);
    }
    expect(delay).toBe(RECONNECT_MAX_BACKOFF_MS);
  });
});
