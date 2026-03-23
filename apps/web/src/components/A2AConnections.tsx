import { memo, useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useWorldStore } from '../store/useWorldStore';
import type { A2AMessageType } from '@lobster-world/protocol';

const A2A_TYPE_COLORS: Record<string, string> = {
  task_delegate: '#3b82f6', // blue
  review_request: '#8b5cf6', // purple
  knowledge_share: '#22c55e', // green
  collab_invite: '#f59e0b', // amber
};

function getA2AColor(type: A2AMessageType): string {
  return A2A_TYPE_COLORS[type] ?? '#94a3b8';
}

export const A2AConnections = memo(function A2AConnections() {
  const a2aConnections = useWorldStore((s) => s.a2aConnections);
  const lobsters = useWorldStore((s) => s.lobsters);

  const lines = useMemo(() => {
    const result: { key: string; points: [number, number, number][]; color: string }[] = [];

    for (const conn of a2aConnections) {
      const from = lobsters[conn.fromId];
      const to = lobsters[conn.toId];
      if (!from || !to) continue;

      const midX = (from.position.x + to.position.x) / 2;
      const midZ = (from.position.z + to.position.z) / 2;
      const arcHeight = 1.2;

      result.push({
        key: conn.id,
        points: [
          [from.position.x, 0.5, from.position.z],
          [midX, arcHeight, midZ],
          [to.position.x, 0.5, to.position.z],
        ],
        color: getA2AColor(conn.type),
      });
    }

    return result;
  }, [a2aConnections, lobsters]);

  return (
    <>
      {lines.map(({ key, points, color }) => (
        <Line
          key={key}
          points={points}
          color={color}
          lineWidth={2}
          transparent
          opacity={0.6}
          dashed
          dashSize={0.1}
          gapSize={0.05}
        />
      ))}
    </>
  );
});
