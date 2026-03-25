import { memo } from 'react';
import { MEETING_ROOM_POSITION } from '@lobster-world/protocol';
import type { Meeting } from '@lobster-world/protocol';
import { useWorldStore } from '../store/useWorldStore';

const CHAIR_OFFSETS: [number, number, number][] = [
  [0, 0.25, -1.2],
  [0, 0.25, 1.2],
  [-1.2, 0.25, 0],
  [1.2, 0.25, 0],
];

const MEETING_INDICATOR_ACTIVE_COLOR = '#3b82f6';
const MEETING_INDICATOR_IDLE_COLOR = '#6b7280';

export const MeetingRoom = memo(function MeetingRoom() {
  const meetings = useWorldStore((state) => state.meetings);

  const activeMeeting: Meeting | undefined = Object.values(meetings).find(
    (m) => m.status === 'active',
  );

  const indicatorColor = activeMeeting ? MEETING_INDICATOR_ACTIVE_COLOR : MEETING_INDICATOR_IDLE_COLOR;

  return (
    <group position={[MEETING_ROOM_POSITION.x, MEETING_ROOM_POSITION.y, MEETING_ROOM_POSITION.z]}>
      {/* Floor patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial color="#d4d8e0" />
      </mesh>

      {/* Round table */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.05, 24]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>

      {/* Table leg */}
      <mesh position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.45, 8]} />
        <meshStandardMaterial color="#4a2e15" />
      </mesh>

      {/* Chairs */}
      {CHAIR_OFFSETS.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[0.4, 0.5, 0.4]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}

      {/* Meeting status indicator — floating sphere above table */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={indicatorColor}
          emissive={indicatorColor}
          emissiveIntensity={activeMeeting ? 0.5 : 0.1}
        />
      </mesh>
    </group>
  );
});
