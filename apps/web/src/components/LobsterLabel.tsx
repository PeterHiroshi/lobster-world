import { memo } from 'react';
import { Billboard, Text } from '@react-three/drei';
import type { LobsterState } from '@lobster-world/protocol';
import { STATUS_COLORS } from '../lib/constants';

const LABEL_Y_OFFSET = 0.9;
const LABEL_FONT_SIZE = 0.08;
const STATUS_DOT_RADIUS = 0.02;
const STATUS_DOT_SEGMENTS = 8;
const STATUS_DOT_X_OFFSET = -0.04;
const NAME_X_OFFSET = 0.04;

interface LobsterLabelProps {
  lobster: LobsterState;
}

export const LobsterLabel = memo(function LobsterLabel({ lobster }: LobsterLabelProps) {
  const statusColor = STATUS_COLORS[lobster.status] ?? STATUS_COLORS.offline;

  return (
    <Billboard position={[0, LABEL_Y_OFFSET, 0]} follow lockX={false} lockY={false} lockZ={false}>
      {/* Status dot */}
      <mesh position={[STATUS_DOT_X_OFFSET, 0, 0]}>
        <circleGeometry args={[STATUS_DOT_RADIUS, STATUS_DOT_SEGMENTS]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {/* Name */}
      <Text
        position={[NAME_X_OFFSET, 0, 0]}
        fontSize={LABEL_FONT_SIZE}
        color="white"
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="black"
      >
        {lobster.profile.name}
      </Text>
    </Billboard>
  );
});
