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
import { CAMERA_INITIAL_POSITION } from '../lib/constants';
import { useWorldStore } from '../store/useWorldStore';
import { isWebGLAvailable, getWebGLUnavailableReason } from '../lib/webgl';
import type { RootState } from '@react-three/fiber';

const RENDER_TIMEOUT_MS = 6000;

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
  const [rendered, setRendered] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (rendered) return;
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, RENDER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [rendered]);

  const handleCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement;

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[Scene] WebGL context lost');
    });

    canvas.addEventListener('webglcontextrestored', () => {
      console.info('[Scene] WebGL context restored');
    });

    // Force initial render
    state.gl.render(state.scene, state.camera);
    setRendered(true);
  }, []);

  if (!isWebGLAvailable()) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-white p-8">
        <h2 className="text-xl font-bold mb-4">WebGL Not Available</h2>
        <p className="text-gray-400 text-sm">{getWebGLUnavailableReason()}</p>
      </div>
    );
  }

  if (timedOut && !rendered) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-white p-8 gap-4">
        <p className="text-gray-400 text-sm">3D scene failed to initialize.</p>
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          onClick={() => {
            setTimedOut(false);
            setRendered(false);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full"
      style={{ background: isDark ? '#1a1a2e' : '#e8f0fe' }}
    >
      <Canvas
        camera={{ position: CAMERA_INITIAL_POSITION, fov: 50 }}
        className="w-full h-full"
        gl={{ powerPreference: 'default', antialias: false, alpha: false }}
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
    </div>
  );
}
