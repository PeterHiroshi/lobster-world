export interface FilterResult {
  safe: boolean;
  matches: string[];
}

export interface SemanticCheckResult {
  safe: boolean;
  reason: string;
}

const DEFAULT_PATTERNS: Record<string, RegExp> = {
  api_key: /\bsk-[a-zA-Z0-9]{10,}\b/g,
  password: /\b(?:password|passwd|pwd)\s*[=:]\s*\S+/gi,
  file_path: /\/(?:home|root|etc|var|tmp|usr)\/\S+/g,
  ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
};

export class OutputFilter {
  private patterns: Map<string, RegExp> = new Map();

  constructor() {
    for (const [name, pattern] of Object.entries(DEFAULT_PATTERNS)) {
      this.patterns.set(name, pattern);
    }
  }

  addPattern(name: string, pattern: RegExp): void {
    this.patterns.set(name, pattern);
  }

  check(text: string): FilterResult {
    const matches: string[] = [];
    for (const [name, pattern] of this.patterns) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        matches.push(name);
      }
    }
    return { safe: matches.length === 0, matches };
  }

  redact(text: string): string {
    let result = text;
    for (const pattern of this.patterns.values()) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }

  semanticCheck(_text: string): SemanticCheckResult {
    // Stub for future embedding-based semantic check
    return { safe: true, reason: 'stub' };
  }
}
