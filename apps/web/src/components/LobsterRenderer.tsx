import { memo, useMemo } from 'react';
import { useWorldStore } from '../store/useWorldStore';
import { Lobster } from './Lobster';
import { MAX_RENDERED_LOBSTERS } from '../lib/constants';

export const LobsterRenderer = memo(function LobsterRenderer() {
  const lobsters = useWorldStore((s) => s.lobsters);

  const visibleLobsters = useMemo(() => {
    const all = Object.values(lobsters);
    if (all.length <= MAX_RENDERED_LOBSTERS) return all;
    // Prioritize online/busy lobsters over away/offline
    return all
      .sort((a, b) => {
        const priority: Record<string, number> = { online: 0, busy: 1, away: 2, dnd: 3, offline: 4 };
        return (priority[a.status] ?? 4) - (priority[b.status] ?? 4);
      })
      .slice(0, MAX_RENDERED_LOBSTERS);
  }, [lobsters]);

  return (
    <>
      {visibleLobsters.map((lobster) => (
        <Lobster key={lobster.id} lobster={lobster} />
      ))}
    </>
  );
});
