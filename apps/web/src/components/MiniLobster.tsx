import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

function MiniLobsterInner({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 2) * 0.05 + 0.25;
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.3;
  });

  return (
    <group ref={groupRef} position={[0, 0.25, 0]} scale={1.2}>
      {/* Body */}
      <mesh>
        <capsuleGeometry args={[0.15, 0.25, 16, 32]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Eyes */}
      <group position={[0, 0.15, 0.12]}>
        <mesh position={[-0.07, 0, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.07, 0, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[-0.07, 0, 0.02]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0.07, 0, 0.02]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
      </group>

      {/* Left Claw */}
      <group position={[-0.22, 0, 0.05]} rotation={[0, 0, 0.3]}>
        <mesh>
          <boxGeometry args={[0.08, 0.04, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.3} />
        </mesh>
      </group>

      {/* Right Claw */}
      <group position={[0.22, 0, 0.05]} rotation={[0, 0, -0.3]}>
        <mesh>
          <boxGeometry args={[0.08, 0.04, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.3} />
        </mesh>
      </group>

      {/* Tail */}
      <mesh position={[0, -0.05, -0.2]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[0.1, 0.15, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    </group>
  );
}

export const MiniLobster = memo(MiniLobsterInner);
