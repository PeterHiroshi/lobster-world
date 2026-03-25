import { memo, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Group, Mesh } from 'three';
import type { LobsterState, AnimationType } from '@lobster-world/protocol';

// Reusable Vector3 for eye pupil tracking — avoids per-frame allocation
const _camDir = new Vector3();
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
  LEG_PAIRS,
  LEG_RADIUS,
  LEG_LENGTH,
  LEG_SPACING,
  PUPIL_TRACK_FACTOR,
  BODY_SEGMENTS_CAP,
  BODY_SEGMENTS_RADIAL,
  ENTRANCE_WALK_SPEED,
} from '../lib/constants';

interface LobsterProps {
  lobster: LobsterState;
}

// Generate a stable hash from lobster id for idle variation
function idHash(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return (hash & 0x7fffffff) / 0x7fffffff; // 0..1
}

function animateLobster(
  groupRef: Group,
  leftClawRef: Group | null,
  rightClawRef: Group | null,
  animation: AnimationType,
  time: number,
  idOffset: number,
) {
  const baseY = 0.25;
  const t = time + idOffset * 10; // per-lobster time offset

  switch (animation) {
    case 'idle': {
      const freq = IDLE_BOB_SPEED * (0.85 + idOffset * 0.3);
      const amp = IDLE_BOB_AMPLITUDE * (0.8 + idOffset * 0.4);
      groupRef.position.y = baseY + Math.sin(t * freq) * amp;
      break;
    }
    case 'walking': {
      groupRef.position.y = baseY + Math.sin(t * IDLE_BOB_SPEED * 2) * IDLE_BOB_AMPLITUDE * 1.5;
      break;
    }
    case 'working': {
      groupRef.position.y = baseY;
      groupRef.rotation.x = -0.15;
      if (leftClawRef) leftClawRef.rotation.x = Math.sin(t * CLAW_OSCILLATION_SPEED) * 0.3;
      if (rightClawRef) rightClawRef.rotation.x = Math.sin(t * CLAW_OSCILLATION_SPEED + 1) * 0.3;
      break;
    }
    case 'chatting': {
      groupRef.position.y = baseY + Math.sin(t * 1.5) * 0.02;
      if (leftClawRef) leftClawRef.rotation.z = Math.sin(t * 3) * 0.2;
      break;
    }
    case 'sleeping': {
      groupRef.position.y = baseY - 0.05;
      groupRef.rotation.z = 0.3;
      groupRef.position.y += Math.sin(t * BREATHING_SPEED) * 0.02;
      break;
    }
    case 'waving': {
      groupRef.position.y = baseY + Math.sin(t * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE;
      if (rightClawRef) {
        rightClawRef.rotation.z = -1.2 + Math.sin(t * 4) * 0.3;
        rightClawRef.position.y = 0.15;
      }
      break;
    }
    case 'thinking': {
      groupRef.position.y = baseY;
      groupRef.rotation.z = Math.sin(t * 0.8) * 0.05;
      if (leftClawRef) {
        leftClawRef.position.y = 0.1;
        leftClawRef.rotation.z = 0.5;
      }
      break;
    }
    case 'celebrating': {
      groupRef.position.y = baseY + Math.abs(Math.sin(t * 4)) * 0.15;
      if (leftClawRef) leftClawRef.rotation.z = Math.sin(t * 6) * 0.5;
      if (rightClawRef) rightClawRef.rotation.z = Math.sin(t * 6 + Math.PI) * 0.5;
      break;
    }
  }
}

function animateLegs(
  legRefs: { current: Group | null }[],
  animation: AnimationType,
  time: number,
) {
  for (let i = 0; i < legRefs.length; i++) {
    const leg = legRefs[i].current;
    if (!leg) continue;

    const pair = Math.floor(i / 2);
    const side = i % 2 === 0 ? 1 : -1;

    if (animation === 'walking') {
      // Alternating pairs move in opposite phase
      const phase = pair % 2 === 0 ? 0 : Math.PI;
      leg.rotation.x = Math.sin(time * 8 + phase) * 0.4;
      leg.rotation.z = side * 0.3 + Math.sin(time * 8 + phase + Math.PI / 2) * 0.1;
    } else {
      // Subtle idle sway
      leg.rotation.x = Math.sin(time * 1.5 + pair * 0.5) * 0.05;
      leg.rotation.z = side * 0.3;
    }
  }
}

export const Lobster = memo(function Lobster({ lobster }: LobsterProps) {
  const groupRef = useRef<Group>(null);
  const bodyGroupRef = useRef<Group>(null);
  const leftClawRef = useRef<Group>(null);
  const rightClawRef = useRef<Group>(null);
  const leftPupilRef = useRef<Mesh>(null);
  const rightPupilRef = useRef<Mesh>(null);
  const scaleRef = useRef(0.01);
  const setFocusLobster = useWorldStore((s) => s.setFocusLobster);
  const selectedLobsterId = useWorldStore((s) => s.selectedLobsterId);
  const setSelectedLobster = useWorldStore((s) => s.setSelectedLobster);
  const entranceAnim = useWorldStore((s) => s.entranceAnimations[lobster.id]);
  const clearEntrance = useWorldStore((s) => s.clearEntrance);
  const { camera } = useThree();

  const idOffset = useMemo(() => idHash(lobster.id), [lobster.id]);

  // Create refs for 8 legs (4 pairs)
  const legRefs = useMemo(
    () => Array.from({ length: LEG_PAIRS * 2 }, () => ({ current: null as Group | null })),
    [],
  );

  useFrame((state) => {
    if (!groupRef.current || !bodyGroupRef.current) return;

    const time = state.clock.elapsedTime;

    // Entrance walk animation — override position target
    if (entranceAnim) {
      const dx = entranceAnim.targetPos.x - groupRef.current.position.x;
      const dz = entranceAnim.targetPos.z - groupRef.current.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.2) {
        // Arrived at desk
        groupRef.current.position.x = entranceAnim.targetPos.x;
        groupRef.current.position.z = entranceAnim.targetPos.z;
        clearEntrance(lobster.id);
      } else {
        groupRef.current.position.x += dx * ENTRANCE_WALK_SPEED;
        groupRef.current.position.z += dz * ENTRANCE_WALK_SPEED;
      }
    } else {
      // Normal smooth position interpolation
      groupRef.current.position.x += (lobster.position.x - groupRef.current.position.x) * POSITION_LERP_FACTOR;
      groupRef.current.position.z += (lobster.position.z - groupRef.current.position.z) * POSITION_LERP_FACTOR;
    }

    // Smooth rotation
    const targetRotation = entranceAnim
      ? Math.atan2(
          entranceAnim.targetPos.x - groupRef.current.position.x,
          entranceAnim.targetPos.z - groupRef.current.position.z,
        )
      : lobster.rotation;
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
      leftClawRef.current.position.set(-0.22, 0, 0.15);
    }
    if (rightClawRef.current) {
      rightClawRef.current.rotation.set(0, 0, 0);
      rightClawRef.current.position.set(0.22, 0, 0.15);
    }

    // Apply animation (force walking during entrance)
    const effectiveAnimation = entranceAnim ? 'walking' as AnimationType : lobster.animation;
    animateLobster(
      bodyGroupRef.current,
      leftClawRef.current,
      rightClawRef.current,
      effectiveAnimation,
      time,
      idOffset,
    );

    // Animate legs
    animateLegs(legRefs, effectiveAnimation, time);

    // Eye pupils track camera (reuse _camDir to avoid GC pressure)
    if (leftPupilRef.current && rightPupilRef.current && groupRef.current) {
      _camDir.copy(camera.position).sub(groupRef.current.position).normalize();
      const px = _camDir.x * PUPIL_TRACK_FACTOR;
      const py = _camDir.y * PUPIL_TRACK_FACTOR;
      leftPupilRef.current.position.x = px;
      leftPupilRef.current.position.y = py;
      leftPupilRef.current.position.z = 0.03;
      rightPupilRef.current.position.x = px;
      rightPupilRef.current.position.y = py;
      rightPupilRef.current.position.z = 0.03;
    }
  });

  const skin = lobster.skin;
  const bodyColor = skin?.bodyColor ?? lobster.profile.color;
  const leftClawColor = skin?.claw1Color ?? bodyColor;
  const rightClawColor = skin?.claw2Color ?? bodyColor;
  const eyeColor = skin?.eyeColor ?? 'black';
  const isSelected = selectedLobsterId === lobster.id;

  return (
    <group
      ref={groupRef}
      position={[lobster.position.x, 0, lobster.position.z]}
      rotation={[0, lobster.rotation, 0]}
      scale={[0.01, 0.01, 0.01]}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedLobster(isSelected ? null : lobster.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setFocusLobster(lobster.id);
      }}
    >
      <group ref={bodyGroupRef} position={[0, 0.25, 0]}>
        {/* Body — smoother capsule */}
        <mesh>
          <capsuleGeometry args={[0.15, 0.3, BODY_SEGMENTS_CAP, BODY_SEGMENTS_RADIAL]} />
          <meshBasicMaterial color={bodyColor} />
        </mesh>

        {/* Left Claw — pincer shape */}
        <group ref={leftClawRef} position={[-0.22, 0, 0.15]}>
          {/* Upper jaw */}
          <mesh position={[0, 0.015, 0.04]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.06, 0.025, 0.12]} />
            <meshBasicMaterial color={leftClawColor} />
          </mesh>
          {/* Lower jaw */}
          <mesh position={[0, -0.015, 0.04]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.06, 0.025, 0.12]} />
            <meshBasicMaterial color={leftClawColor} />
          </mesh>
        </group>

        {/* Right Claw — pincer shape */}
        <group ref={rightClawRef} position={[0.22, 0, 0.15]}>
          <mesh position={[0, 0.015, 0.04]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.06, 0.025, 0.12]} />
            <meshBasicMaterial color={rightClawColor} />
          </mesh>
          <mesh position={[0, -0.015, 0.04]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.06, 0.025, 0.12]} />
            <meshBasicMaterial color={rightClawColor} />
          </mesh>
        </group>

        {/* Legs — 4 pairs */}
        {Array.from({ length: LEG_PAIRS * 2 }, (_, i) => {
          const pair = Math.floor(i / 2);
          const side = i % 2 === 0 ? -1 : 1;
          const zPos = -0.1 + pair * LEG_SPACING;
          return (
            <group
              key={i}
              ref={(el) => { legRefs[i].current = el; }}
              position={[side * 0.12, -0.15, zPos]}
              rotation={[0, 0, side * 0.3]}
            >
              <mesh>
                <cylinderGeometry args={[LEG_RADIUS, LEG_RADIUS * 0.6, LEG_LENGTH, 4]} />
                <meshBasicMaterial color={bodyColor} />
              </mesh>
            </group>
          );
        })}

        {/* Left Eye */}
        <group position={[-0.06, 0.2, 0.1]}>
          <mesh>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <mesh ref={leftPupilRef} position={[0, 0, 0.03]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={eyeColor} />
          </mesh>
        </group>

        {/* Right Eye */}
        <group position={[0.06, 0.2, 0.1]}>
          <mesh>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <mesh ref={rightPupilRef} position={[0, 0, 0.03]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={eyeColor} />
          </mesh>
        </group>

        {/* Tail */}
        <mesh position={[0, -0.05, -0.25]} rotation={[0.3, 0, 0]}>
          <coneGeometry args={[0.08, 0.15, 8]} />
          <meshBasicMaterial color={bodyColor} />
        </mesh>

        {/* Left Antenna */}
        <mesh position={[-0.04, 0.3, 0.08]} rotation={[0.3, 0, -0.3]}>
          <cylinderGeometry args={[0.008, 0.005, 0.15, 4]} />
          <meshBasicMaterial color={bodyColor} />
        </mesh>

        {/* Right Antenna */}
        <mesh position={[0.04, 0.3, 0.08]} rotation={[0.3, 0, 0.3]}>
          <cylinderGeometry args={[0.008, 0.005, 0.15, 4]} />
          <meshBasicMaterial color={bodyColor} />
        </mesh>
      </group>

      {/* Selection glow ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 32]} />
          <meshBasicMaterial color={bodyColor} transparent opacity={0.4} />
        </mesh>
      )}

      {/* Label */}
      <LobsterLabel lobster={lobster} />
    </group>
  );
});
