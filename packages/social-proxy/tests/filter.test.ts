import { describe, it, expect } from 'vitest';
import { OutputFilter } from '../src/filter.js';

describe('OutputFilter', () => {
  it('detects API keys (sk-... pattern)', () => {
    const filter = new OutputFilter();
    const result = filter.check('My key is sk-abc123def456');
    expect(result.safe).toBe(false);
    expect(result.matches).toContain('api_key');
  });

  it('detects passwords in text', () => {
    const filter = new OutputFilter();
    const result = filter.check('password=mysecret123');
    expect(result.safe).toBe(false);
    expect(result.matches).toContain('password');
  });

  it('detects file paths', () => {
    const filter = new OutputFilter();
    const result = filter.check('Check /home/user/.ssh/id_rsa');
    expect(result.safe).toBe(false);
    expect(result.matches).toContain('file_path');
  });

  it('detects IP addresses', () => {
    const filter = new OutputFilter();
    const result = filter.check('Server at 192.168.1.100');
    expect(result.safe).toBe(false);
    expect(result.matches).toContain('ip_address');
  });

  it('detects email addresses', () => {
    const filter = new OutputFilter();
    const result = filter.check('Contact admin@example.com');
    expect(result.safe).toBe(false);
    expect(result.matches).toContain('email');
  });

  it('passes safe text', () => {
    const filter = new OutputFilter();
    const result = filter.check('Hello, how are you today?');
    expect(result.safe).toBe(true);
    expect(result.matches).toEqual([]);
  });

  it('redacts sensitive content', () => {
    const filter = new OutputFilter();
    const redacted = filter.redact('My key is sk-abc123def456');
    expect(redacted).not.toContain('sk-abc123def456');
    expect(redacted).toContain('[REDACTED]');
  });

  it('detects multiple sensitive patterns', () => {
    const filter = new OutputFilter();
    const result = filter.check('sk-abcdef1234567890 and admin@test.com at 10.0.0.1');
    expect(result.safe).toBe(false);
    expect(result.matches).toContain('api_key');
    expect(result.matches).toContain('email');
    expect(result.matches).toContain('ip_address');
  });

  it('allows adding custom patterns', () => {
    const filter = new OutputFilter();
    filter.addPattern('custom', /SECRET_\w+/g);
    const result = filter.check('Found SECRET_TOKEN_123');
    expect(result.safe).toBe(false);
    expect(result.matches).toContain('custom');
  });

  it('has a stub semantic check that returns safe by default', () => {
    const filter = new OutputFilter();
    const result = filter.semanticCheck('some text');
    expect(result.safe).toBe(true);
    expect(result.reason).toBe('stub');
  });
});
