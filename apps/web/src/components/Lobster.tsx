import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { LobsterState, AnimationType } from '@lobster-world/protocol';
import { LobsterLabel } from './LobsterLabel';
import { useWorldStore } from '../store/useWorldStore';
import {
  LOBSTER_SCALE,
  POSITION_LERP_FACTOR,
  IDLE_BOB_AMPLITUDE,
  IDLE_BOB_SPEED,
  BREATHING_SPEED,
  CLAW_OSCILLATION_SPEED,
  ENTER_EXIT_SCALE_SPEED,
} from '../lib/constants';

interface LobsterProps {
  lobster: LobsterState;
}

function animateLobster(
  groupRef: Group,
  leftClawRef: Group | null,
  rightClawRef: Group | null,
  animation: AnimationType,
  time: number,
) {
  const baseY = 0.25;

  switch (animation) {
    case 'idle': {
      groupRef.position.y = baseY + Math.sin(time * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE;
      break;
    }
    case 'walking': {
      groupRef.position.y = baseY + Math.sin(time * IDLE_BOB_SPEED * 2) * IDLE_BOB_AMPLITUDE * 1.5;
      break;
    }
    case 'working': {
      groupRef.position.y = baseY;
      groupRef.rotation.x = -0.15;
      if (leftClawRef) leftClawRef.rotation.x = Math.sin(time * CLAW_OSCILLATION_SPEED) * 0.3;
      if (rightClawRef) rightClawRef.rotation.x = Math.sin(time * CLAW_OSCILLATION_SPEED + 1) * 0.3;
      break;
    }
    case 'chatting': {
      groupRef.position.y = baseY + Math.sin(time * 1.5) * 0.02;
      if (leftClawRef) leftClawRef.rotation.z = Math.sin(time * 3) * 0.2;
      break;
    }
    case 'sleeping': {
      groupRef.position.y = baseY - 0.05;
      groupRef.rotation.z = 0.3;
      groupRef.position.y += Math.sin(time * BREATHING_SPEED) * 0.02;
      break;
    }
    case 'waving': {
      groupRef.position.y = baseY + Math.sin(time * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE;
      if (rightClawRef) {
        rightClawRef.rotation.z = -1.2 + Math.sin(time * 4) * 0.3;
        rightClawRef.position.y = 0.15;
      }
      break;
    }
    case 'thinking': {
      groupRef.position.y = baseY;
      groupRef.rotation.z = Math.sin(time * 0.8) * 0.05;
      if (leftClawRef) {
        leftClawRef.position.y = 0.1;
        leftClawRef.rotation.z = 0.5;
      }
      break;
    }
    case 'celebrating': {
      groupRef.position.y = baseY + Math.abs(Math.sin(time * 4)) * 0.15;
      if (leftClawRef) leftClawRef.rotation.z = Math.sin(time * 6) * 0.5;
      if (rightClawRef) rightClawRef.rotation.z = Math.sin(time * 6 + Math.PI) * 0.5;
      break;
    }
  }
}

export const Lobster = memo(function Lobster({ lobster }: LobsterProps) {
  const groupRef = useRef<Group>(null);
  const bodyGroupRef = useRef<Group>(null);
  const leftClawRef = useRef<Group>(null);
  const rightClawRef = useRef<Group>(null);
  const scaleRef = useRef(0);
  const setFocusLobster = useWorldStore((s) => s.setFocusLobster);

  useFrame((state) => {
    if (!groupRef.current || !bodyGroupRef.current) return;

    const time = state.clock.elapsedTime;

    // Smooth position interpolation
    groupRef.current.position.x += (lobster.position.x - groupRef.current.position.x) * POSITION_LERP_FACTOR;
    groupRef.current.position.z += (lobster.position.z - groupRef.current.position.z) * POSITION_LERP_FACTOR;

    // Smooth rotation
    const targetRotation = lobster.rotation;
    let diff = targetRotation - groupRef.current.rotation.y;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    groupRef.current.rotation.y += diff * POSITION_LERP_FACTOR;

    // Enter scale animation
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(1, scaleRef.current + ENTER_EXIT_SCALE_SPEED);
      const s = scaleRef.current * LOBSTER_SCALE;
      groupRef.current.scale.set(s, s, s);
    }

    // Reset body group transforms before animation
    bodyGroupRef.current.rotation.set(0, 0, 0);
    bodyGroupRef.current.position.y = 0.25;
    if (leftClawRef.current) {
      leftClawRef.current.rotation.set(0, 0, 0);
      leftClawRef.current.position.set(-0.2, 0, 0.15);
    }
    if (rightClawRef.current) {
      rightClawRef.current.rotation.set(0, 0, 0);
      rightClawRef.current.position.set(0.2, 0, 0.15);
    }

    // Apply animation
    animateLobster(
      bodyGroupRef.current,
      leftClawRef.current,
      rightClawRef.current,
      lobster.animation,
      time,
    );
  });

  const color = lobster.profile.color;

  return (
    <group
      ref={groupRef}
      position={[lobster.position.x, 0, lobster.position.z]}
      rotation={[0, lobster.rotation, 0]}
      scale={[0, 0, 0]}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setFocusLobster(lobster.id);
      }}
    >
      <group ref={bodyGroupRef} position={[0, 0.25, 0]}>
        {/* Body */}
        <mesh castShadow>
          <capsuleGeometry args={[0.15, 0.3, 8, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Left Claw */}
        <group ref={leftClawRef} position={[-0.2, 0, 0.15]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.04, 0.12]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>

        {/* Right Claw */}
        <group ref={rightClawRef} position={[0.2, 0, 0.15]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.04, 0.12]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>

        {/* Left Eye */}
        <group position={[-0.06, 0.2, 0.1]}>
          <mesh>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="black" />
          </mesh>
        </group>

        {/* Right Eye */}
        <group position={[0.06, 0.2, 0.1]}>
          <mesh>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="black" />
          </mesh>
        </group>

        {/* Tail */}
        <mesh position={[0, -0.05, -0.25]} rotation={[0.3, 0, 0]} castShadow>
          <coneGeometry args={[0.08, 0.15, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Left Antenna */}
        <mesh position={[-0.04, 0.3, 0.08]} rotation={[0.3, 0, -0.3]}>
          <cylinderGeometry args={[0.008, 0.005, 0.15, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Right Antenna */}
        <mesh position={[0.04, 0.3, 0.08]} rotation={[0.3, 0, 0.3]}>
          <cylinderGeometry args={[0.008, 0.005, 0.15, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* Label */}
      <LobsterLabel lobster={lobster} />
    </group>
  );
});
