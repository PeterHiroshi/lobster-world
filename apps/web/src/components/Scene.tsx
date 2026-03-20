import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Office } from './Office';
import { LobsterRenderer } from './LobsterRenderer';
import { CameraController } from './CameraController';
import { Particles } from './Particles';
import { DialogueConnections } from './DialogueConnections';
import { CAMERA_INITIAL_POSITION } from '../lib/constants';

export function Scene() {
  return (
    <Canvas
      camera={{ position: CAMERA_INITIAL_POSITION, fov: 50 }}
      shadows
      className="w-full h-full"
    >
      <CameraController />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      <Environment preset="studio" />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Office />
      <LobsterRenderer />
      <Particles />
      <DialogueConnections />
    </Canvas>
  );
}
