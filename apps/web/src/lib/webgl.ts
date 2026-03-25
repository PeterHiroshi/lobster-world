/**
 * WebGL capability detection utilities.
 */

/** Check whether the current browser supports WebGL 2 (or WebGL 1 as fallback). */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return gl !== null;
  } catch {
    return false;
  }
}

/** Human-readable reason when WebGL is unavailable. */
export function getWebGLUnavailableReason(): string {
  return 'Your browser or device does not support WebGL, which is required for 3D rendering. Try updating your browser or enabling hardware acceleration.';
}
