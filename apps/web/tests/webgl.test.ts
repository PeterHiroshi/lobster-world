// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWebGLAvailable, getWebGLUnavailableReason } from '../src/lib/webgl';

describe('isWebGLAvailable', () => {
  let originalGetContext: HTMLCanvasElement['getContext'];

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('returns true when webgl2 context is available', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({}) as never;
    expect(isWebGLAvailable()).toBe(true);
  });

  it('returns false when no context is available', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as never;
    expect(isWebGLAvailable()).toBe(false);
  });

  it('returns false when getContext throws', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => {
      throw new Error('not supported');
    }) as never;
    expect(isWebGLAvailable()).toBe(false);
  });
});

describe('getWebGLUnavailableReason', () => {
  it('returns a descriptive message', () => {
    const reason = getWebGLUnavailableReason();
    expect(reason).toContain('WebGL');
    expect(reason).toContain('browser');
  });
});
