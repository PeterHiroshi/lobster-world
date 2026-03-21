import { memo, useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useWorldStore } from '../store/useWorldStore';

export const DialogueConnections = memo(function DialogueConnections() {
  const activeDialogues = useWorldStore((s) => s.activeDialogues);
  const lobsters = useWorldStore((s) => s.lobsters);

  const connections = useMemo(() => {
    const result: { key: string; points: [number, number, number][] }[] = [];
    for (const dialogue of Object.values(activeDialogues)) {
      if (dialogue.ended) continue;
      const l1 = lobsters[dialogue.participants[0]];
      const l2 = lobsters[dialogue.participants[1]];
      if (!l1 || !l2) continue;

      // Create arc between two lobsters
      const midX = (l1.position.x + l2.position.x) / 2;
      const midZ = (l1.position.z + l2.position.z) / 2;
      const arcHeight = 0.8;

      result.push({
        key: dialogue.sessionId,
        points: [
          [l1.position.x, 0.5, l1.position.z],
          [midX, arcHeight, midZ],
          [l2.position.x, 0.5, l2.position.z],
        ],
      });
    }
    return result;
  }, [activeDialogues, lobsters]);

  return (
    <>
      {connections.map(({ key, points }) => (
        <Line
          key={key}
          points={points}
          color="#ffd700"
          lineWidth={1.5}
          transparent
          opacity={0.4}
        />
      ))}
    </>
  );
});
