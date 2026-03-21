import { memo } from 'react';
import { Text } from '@react-three/drei';

interface AgentDeskProps {
  position: [number, number, number];
  agentName: string;
  roleIcon: string;
  roleColor: string;
}

export const AgentDesk = memo(function AgentDesk({
  position,
  agentName,
  roleIcon,
  roleColor,
}: AgentDeskProps) {
  return (
    <group position={position}>
      {/* Desk surface */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.05, 0.8]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>

      {/* Legs */}
      {([[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]] as const).map(
        ([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.375, lz]}>
            <boxGeometry args={[0.05, 0.75, 0.05]} />
            <meshStandardMaterial color="#6B5210" />
          </mesh>
        ),
      )}

      {/* Monitor */}
      <mesh position={[0, 1.05, -0.2]} castShadow>
        <boxGeometry args={[0.5, 0.35, 0.03]} />
        <meshStandardMaterial
          color="#1a1a2e"
          emissive={roleColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Monitor stand */}
      <mesh position={[0, 0.87, -0.2]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Nameplate */}
      <mesh position={[0, 0.85, 0.35]}>
        <boxGeometry args={[0.6, 0.15, 0.02]} />
        <meshStandardMaterial color={roleColor} />
      </mesh>

      {/* Nameplate text */}
      <Text
        position={[0, 0.85, 0.365]}
        fontSize={0.06}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {`${roleIcon} ${agentName}`}
      </Text>
    </group>
  );
});
