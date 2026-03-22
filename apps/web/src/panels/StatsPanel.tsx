import { useWorldStore } from '../store/useWorldStore';

export function StatsPanel() {
  const stats = useWorldStore((s) => s.stats);

  return (
    <div className="absolute top-3 left-3 flex gap-3 z-10 hidden md:flex">
      <StatBadge label="Lobsters" value={stats.lobsterCount} />
      <StatBadge label="Dialogues" value={stats.activeDialogues} />
      <StatBadge label="Messages" value={stats.totalMessages} />
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel-glass px-3 py-1.5 rounded-lg text-sm">
      <span className="opacity-60">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
