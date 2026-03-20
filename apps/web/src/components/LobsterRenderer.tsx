import { useWorldStore } from '../store/useWorldStore';
import { Lobster } from './Lobster';

export function LobsterRenderer() {
  const lobsters = useWorldStore((s) => s.lobsters);

  return (
    <>
      {Object.values(lobsters).map((lobster) => (
        <Lobster key={lobster.id} lobster={lobster} />
      ))}
    </>
  );
}
