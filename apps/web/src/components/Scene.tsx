import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Office } from './Office';
import { LobsterRenderer } from './LobsterRenderer';
import { CameraController } from './CameraController';
import { Particles } from './Particles';
import { DialogueConnections } from './DialogueConnections';
import { A2AConnections } from './A2AConnections';
import { LobsterDetailCard } from './LobsterDetailCard';
import { CAMERA_INITIAL_POSITION } from '../lib/constants';
import { useWorldStore } from '../store/useWorldStore';

function SceneLighting() {
  const theme = useWorldStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <>
      <ambientLight intensity={isDark ? 0.4 : 0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={isDark ? 0.8 : 1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {isDark && <fog attach="fog" args={['#0f172a', 15, 35]} />}
      {!isDark && <fog attach="fog" args={['#f8fafc', 20, 45]} />}
    </>
  );
}

export function Scene() {
  const theme = useWorldStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <Canvas
      camera={{ position: CAMERA_INITIAL_POSITION, fov: 50 }}
      shadows
      className="w-full h-full"
      style={{ background: isDark ? '#0f172a' : '#f1f5f9' }}
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
