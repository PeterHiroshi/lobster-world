import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseCorsOrigins } from '../src/config.js';

describe('parseCorsOrigins', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.CORS_ORIGINS;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = originalEnv;
    }
  });

  it('returns default localhost:5173 when no env var set', () => {
    delete process.env.CORS_ORIGINS;
    expect(parseCorsOrigins()).toEqual(['http://localhost:5173']);
  });

  it('parses a single origin', () => {
    process.env.CORS_ORIGINS = 'https://example.com';
    expect(parseCorsOrigins()).toEqual(['https://example.com']);
  });

  it('parses comma-separated origins', () => {
    process.env.CORS_ORIGINS = 'http://localhost:5173,https://example.com';
    expect(parseCorsOrigins()).toEqual(['http://localhost:5173', 'https://example.com']);
  });

  it('trims whitespace around origins', () => {
    process.env.CORS_ORIGINS = ' http://a.com , http://b.com ';
    expect(parseCorsOrigins()).toEqual(['http://a.com', 'http://b.com']);
  });

  it('filters out empty strings', () => {
    process.env.CORS_ORIGINS = 'http://a.com,,http://b.com,';
    expect(parseCorsOrigins()).toEqual(['http://a.com', 'http://b.com']);
  });
});
