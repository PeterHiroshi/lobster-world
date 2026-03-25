import { useCallback, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Office } from './Office';
import { LobsterRenderer } from './LobsterRenderer';
import { CameraController } from './CameraController';
import { Particles } from './Particles';
import { DialogueConnections } from './DialogueConnections';
import { A2AConnections } from './A2AConnections';
import { LobsterDetailCard } from './LobsterDetailCard';
import {
  CAMERA_INITIAL_POSITION,
  SHADOW_MAP_SIZE,
} from '../lib/constants';
import { useWorldStore } from '../store/useWorldStore';
import { isWebGLAvailable, getWebGLUnavailableReason } from '../lib/webgl';
import type { RootState } from '@react-three/fiber';

const SceneLighting = memo(function SceneLighting() {
  const theme = useWorldStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <>
      <ambientLight intensity={isDark ? 0.4 : 0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={isDark ? 0.8 : 1.2}
        castShadow
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
      />
      {isDark && <fog attach="fog" args={['#0f172a', 15, 35]} />}
      {!isDark && <fog attach="fog" args={['#f8fafc', 20, 45]} />}
    </>
  );
});

export function Scene() {
  const theme = useWorldStore((s) => s.theme);
  const isDark = theme === 'dark';

  const handleCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement;

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[Scene] WebGL context lost');
    });

    canvas.addEventListener('webglcontextrestored', () => {
      console.info('[Scene] WebGL context restored');
    });
  }, []);

  if (!isWebGLAvailable()) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-white p-8">
        <h2 className="text-xl font-bold mb-4">WebGL Not Available</h2>
        <p className="text-gray-400 text-sm">{getWebGLUnavailableReason()}</p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: CAMERA_INITIAL_POSITION, fov: 50 }}
      shadows
      className="w-full h-full"
      style={{ background: isDark ? '#0f172a' : '#f1f5f9' }}
      onCreated={handleCreated}
    >
      <CameraController />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      <Environment preset={isDark ? 'night' : 'studio'} />
      <SceneLighting />
      <Office />
      <LobsterRenderer />
      <Particles />
      <DialogueConnections />
      <A2AConnections />
      <LobsterDetailCard />
    </Canvas>
  );
}
