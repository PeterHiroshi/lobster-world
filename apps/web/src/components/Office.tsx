import { memo } from 'react';
import { Grid } from '@react-three/drei';
import { PRESET_ROLES, ROLE_DESK_POSITIONS } from '@lobster-world/protocol';
import { FLOOR_SIZE, COFFEE_AREA_POSITION } from '../lib/constants';
import { useWorldStore } from '../store/useWorldStore';
import { KanbanWall } from './KanbanWall';
import { AgentDesk } from './AgentDesk';
import { ServerRack } from './ServerRack';
import { MeetingRoom } from './MeetingRoom';

function CoffeeArea() {
  const [x, z] = COFFEE_AREA_POSITION;
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>
      <mesh position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.45, 8]} />
        <meshStandardMaterial color="#4a2e15" />
      </mesh>
    </group>
  );
}

const AgentDesks = memo(function AgentDesks() {
  const teamAgents = useWorldStore((s) => s.teamAgents);

  if (teamAgents.length === 0) {
    return null;
  }

  return (
    <>
      {teamAgents.map((agent) => {
        const role = PRESET_ROLES.find((r) => r.id === agent.roleId);
        const deskPos = ROLE_DESK_POSITIONS[agent.roleId] ?? { x: 0, z: 0 };
        return (
          <AgentDesk
            key={agent.id}
            position={[deskPos.x, 0, deskPos.z]}
            agentName={agent.name}
            roleIcon={role?.icon ?? '?'}
            roleColor={role?.color ?? agent.color}
          />
        );
      })}
    </>
  );
});

export const Office = memo(function Office() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      {/* Grid overlay */}
      <Grid
        args={[FLOOR_SIZE, FLOOR_SIZE]}
        position={[0, 0.001, 0]}
        cellSize={1}
        cellColor="#d1d5db"
        sectionSize={5}
        sectionColor="#9ca3af"
        fadeDistance={25}
        infiniteGrid={false}
      />

      {/* Agent desks (role-based layout) */}
      <AgentDesks />

      {/* Kanban wall */}
      <KanbanWall />

      {/* Meeting room */}
      <MeetingRoom />

      {/* Server rack */}
      <ServerRack />

      {/* Coffee area */}
      <CoffeeArea />
    </group>
  );
});
