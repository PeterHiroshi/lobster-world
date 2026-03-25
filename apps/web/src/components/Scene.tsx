import { Canvas } from '@react-three/fiber';

export function Scene() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: '#1a1a2e' }}
      camera={{ position: [10, 10, 10], fov: 45 }}
    >
      <ambientLight intensity={1.0} />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="hotpink" />
      </mesh>
    </Canvas>
  );
}
