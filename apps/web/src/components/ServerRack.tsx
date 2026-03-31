import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SERVER_RACK_POSITION } from '@lobster-world/protocol';
import type { Mesh, MeshBasicMaterial } from 'three';

const LED_POSITIONS: [number, number, number][] = [
  [-0.15, 0.5, 0.26],
  [0.15, 0.5, 0.26],
  [-0.15, 1.0, 0.26],
  [0.15, 1.0, 0.26],
  [-0.15, 1.5, 0.26],
  [0.15, 1.5, 0.26],
];

const LED_RATE_OFFSETS = [0, 1.2, 2.4, 3.6, 4.8, 6.0];

const GREEN = 0x00ff00;
const OFF = 0x333333;

export const ServerRack = memo(function ServerRack() {
  const ledRefs = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < 6; i++) {
      const mesh = ledRefs.current[i];
      if (!mesh) continue;
      const val = Math.sin(t * 3 + LED_RATE_OFFSETS[i]);
      const material = mesh.material as MeshBasicMaterial;
      material.color.setHex(val > 0 ? GREEN : OFF);
    }
  });

  return (
    <group position={[SERVER_RACK_POSITION.x, SERVER_RACK_POSITION.y, SERVER_RACK_POSITION.z]}>
      {/* Main body */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.8, 2.0, 0.5]} />
        <meshBasicMaterial color="#2a2a2a" />
      </mesh>

      {/* Shelf units */}
      {([0.5, 1.0, 1.5] as const).map((y, i) => (
        <mesh key={i} position={[0, y, 0.05]}>
          <boxGeometry args={[0.75, 0.05, 0.45]} />
          <meshBasicMaterial color="#3a3a3a" />
        </mesh>
      ))}

      {/* LED lights */}
      {LED_POSITIONS.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => {
            ledRefs.current[i] = el;
          }}
          position={pos}
        >
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#333" />
        </mesh>
      ))}
    </group>
  );
});
