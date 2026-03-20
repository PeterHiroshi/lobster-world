import { memo } from 'react';
import { Html } from '@react-three/drei';
import type { LobsterState } from '@lobster-world/protocol';
import { STATUS_COLORS } from '../lib/constants';

interface LobsterLabelProps {
  lobster: LobsterState;
}

export const LobsterLabel = memo(function LobsterLabel({ lobster }: LobsterLabelProps) {
  const statusColor = STATUS_COLORS[lobster.status] ?? STATUS_COLORS.offline;

  return (
    <Html
      position={[0, 0.9, 0]}
      center
      distanceFactor={8}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div className="flex flex-col items-center gap-0.5 whitespace-nowrap">
        {/* Chat bubble */}
        {lobster.bubbleText && (
          <div className="bg-white text-gray-800 text-xs px-2 py-1 rounded-lg shadow-md max-w-32 text-center mb-1">
            {lobster.bubbleText}
          </div>
        )}

        {/* Name + status */}
        <div className="flex items-center gap-1 bg-gray-900/80 text-white text-xs px-2 py-0.5 rounded">
          <span
            className="w-2 h-2 rounded-full inline-block flex-shrink-0"
            style={{ backgroundColor: statusColor }}
          />
          <span className="font-medium">{lobster.profile.name}</span>
        </div>

        {/* Activity */}
        {lobster.activity && (
          <div className="bg-gray-800/70 text-gray-300 text-[10px] px-1.5 py-0.5 rounded">
            {lobster.activity}
          </div>
        )}
      </div>
    </Html>
  );
});
