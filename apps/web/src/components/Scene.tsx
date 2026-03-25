import { useCallback, useState, useEffect, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Office } from './Office';
import { LobsterRenderer } from './LobsterRenderer';
import { CameraController } from './CameraController';
import { Particles } from './Particles';
import { DialogueConnections } from './DialogueConnections';
import { A2AConnections } from './A2AConnections';
import { LobsterDetailCard } from './LobsterDetailCard';
import {
  CAMERA_INITIAL_POSITION,
} from '../lib/constants';
import { useWorldStore } from '../store/useWorldStore';
import { isWebGLAvailable, getWebGLUnavailableReason } from '../lib/webgl';
import type { RootState } from '@react-three/fiber';

/** Max time (ms) to wait for Canvas onCreated before showing fallback. */
export const SCENE_RENDER_TIMEOUT_MS = 5000;
/** Delay (ms) before mounting the Canvas to let React settle. */
export const SCENE_MOUNT_DELAY_MS = 100;

const SceneLighting = memo(function SceneLighting() {
  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />
    </>
  );
});

export function Scene() {
  const theme = useWorldStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Two-phase mount: delay canvas mount, then track if WebGL initialized
  const [canvasReady, setCanvasReady] = useState(false);
  const [mountCanvas, setMountCanvas] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);

  // Phase 1: short delay before mounting Canvas (lets React commit the loading UI first)
  useEffect(() => {
    const mountTimer = setTimeout(() => {
      setMountCanvas(true);
    }, SCENE_MOUNT_DELAY_MS);
    return () => clearTimeout(mountTimer);
  }, []);

  // Phase 2: timeout — if Canvas never fires onCreated, show fallback
  useEffect(() => {
    if (!mountCanvas || canvasReady) return;
    const failTimer = setTimeout(() => {
      if (!canvasReady) {
        setRenderFailed(true);
      }
    }, SCENE_RENDER_TIMEOUT_MS);
    return () => clearTimeout(failTimer);
  }, [mountCanvas, canvasReady]);

  const handleCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement;

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[Scene] WebGL context lost');
    });

    canvas.addEventListener('webglcontextrestored', () => {
      console.info('[Scene] WebGL context restored');
    });

    setCanvasReady(true);
  }, []);

  if (!isWebGLAvailable()) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-white p-8">
        <h2 className="text-xl font-bold mb-4">WebGL Not Available</h2>
        <p className="text-gray-400 text-sm">{getWebGLUnavailableReason()}</p>
      </div>
    );
  }

  if (renderFailed) {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full text-white p-8"
        style={{ background: isDark ? '#1a1a2e' : '#e8f0fe' }}
        data-testid="scene-render-failed"
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: isDark ? '#fff' : '#1a1a2e' }}>
          3D Scene Could Not Load
        </h2>
        <p className="text-sm mb-4" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>
          WebGL initialization timed out. Try refreshing or enabling hardware acceleration.
        </p>
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => {
            setRenderFailed(false);
            setCanvasReady(false);
            setMountCanvas(false);
            setTimeout(() => setMountCanvas(true), SCENE_MOUNT_DELAY_MS);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ background: isDark ? '#1a1a2e' : '#e8f0fe' }}>
      {/* Loading overlay — visible until Canvas fires onCreated */}
      {!canvasReady && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          data-testid="scene-loading"
        >
          <p className="text-lg animate-pulse" style={{ color: isDark ? '#fff' : '#1a1a2e' }}>
            Initializing Lobster World...
          </p>
        </div>
      )}

      {mountCanvas && (
        <Canvas
          camera={{ position: CAMERA_INITIAL_POSITION, fov: 50 }}
          className="w-full h-full"
          gl={{
            powerPreference: 'high-performance',
            antialias: false,
            alpha: false,
          }}
          onCreated={handleCreated}
        >
          <CameraController />
          <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
          <SceneLighting />
          <Office />
          <LobsterRenderer />
          <Particles />
          <DialogueConnections />
          <A2AConnections />
          <LobsterDetailCard />
        </Canvas>
      )}
    </div>
  );
}
