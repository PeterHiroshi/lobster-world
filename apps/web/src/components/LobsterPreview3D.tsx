import { memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { LobsterSkin } from '@lobster-world/protocol';
import {
  CUSTOMIZATION_DEFAULT_BODY_COLOR,
} from '@lobster-world/protocol';
import {
  LEG_PAIRS,
  LEG_RADIUS,
  LEG_LENGTH,
  LEG_SPACING,
  BODY_SEGMENTS_CAP,
  BODY_SEGMENTS_RADIAL,
} from '../lib/constants';

interface LobsterPreview3DProps {
  skin: LobsterSkin;
}

function PreviewModel({ skin }: { skin: LobsterSkin }) {
  const bodyColor = skin.bodyColor || CUSTOMIZATION_DEFAULT_BODY_COLOR;
  const leftClawColor = skin.claw1Color || bodyColor;
  const rightClawColor = skin.claw2Color || bodyColor;
  const eyeColor = skin.eyeColor || 'black';

  return (
    <group position={[0, 0, 0]}>
      <group position={[0, 0.25, 0]}>
        {/* Body */}
        <mesh castShadow>
          <capsuleGeometry args={[0.15, 0.3, BODY_SEGMENTS_CAP, BODY_SEGMENTS_RADIAL]} />
          <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.1} />
        </mesh>

        {/* Left Claw */}
        <group position={[-0.22, 0, 0.15]}>
          <mesh castShadow position={[0, 0.015, 0.04]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.06, 0.025, 0.12]} />
            <meshStandardMaterial color={leftClawColor} roughness={0.3} />
          </mesh>
          <mesh castShadow position={[0, -0.015, 0.04]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.06, 0.025, 0.12]} />
            <meshStandardMaterial color={leftClawColor} roughness={0.3} />
          </mesh>
        </group>

        {/* Right Claw */}
        <group position={[0.22, 0, 0.15]}>
          <mesh castShadow position={[0, 0.015, 0.04]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.06, 0.025, 0.12]} />
            <meshStandardMaterial color={rightClawColor} roughness={0.3} />
          </mesh>
          <mesh castShadow position={[0, -0.015, 0.04]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.06, 0.025, 0.12]} />
            <meshStandardMaterial color={rightClawColor} roughness={0.3} />
          </mesh>
        </group>

        {/* Legs */}
        {Array.from({ length: LEG_PAIRS * 2 }, (_, i) => {
          const pair = Math.floor(i / 2);
          const side = i % 2 === 0 ? -1 : 1;
          const zPos = -0.1 + pair * LEG_SPACING;
          return (
            <group key={i} position={[side * 0.12, -0.15, zPos]} rotation={[0, 0, side * 0.3]}>
              <mesh castShadow>
                <cylinderGeometry args={[LEG_RADIUS, LEG_RADIUS * 0.6, LEG_LENGTH, 4]} />
                <meshStandardMaterial color={bodyColor} roughness={0.4} />
              </mesh>
            </group>
          );
        })}

        {/* Left Eye */}
        <group position={[-0.06, 0.2, 0.1]}>
          <mesh>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color={eyeColor} />
          </mesh>
        </group>

        {/* Right Eye */}
        <group position={[0.06, 0.2, 0.1]}>
          <mesh>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color={eyeColor} />
          </mesh>
        </group>

        {/* Tail */}
        <mesh position={[0, -0.05, -0.25]} rotation={[0.3, 0, 0]} castShadow>
          <coneGeometry args={[0.08, 0.15, 8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.4} />
        </mesh>

        {/* Antennae */}
        <mesh position={[-0.04, 0.3, 0.08]} rotation={[0.3, 0, -0.3]}>
          <cylinderGeometry args={[0.008, 0.005, 0.15, 4]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh position={[0.04, 0.3, 0.08]} rotation={[0.3, 0, 0.3]}>
          <cylinderGeometry args={[0.008, 0.005, 0.15, 4]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      </group>
    </group>
  );
}

export const LobsterPreview3D = memo(function LobsterPreview3D({ skin }: LobsterPreview3DProps) {
  return (
    <div className="h-64 w-full rounded-lg overflow-hidden bg-black/20">
      <Canvas camera={{ position: [0.8, 0.6, 0.8], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1} />
        <PreviewModel skin={skin} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={2}
        />
      </Canvas>
    </div>
  );
});
