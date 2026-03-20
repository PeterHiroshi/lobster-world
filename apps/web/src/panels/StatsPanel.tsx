import { useWorldStore } from '../store/useWorldStore';

export function StatsPanel() {
  const stats = useWorldStore((s) => s.stats);

  return (
    <div className="absolute top-3 left-3 flex gap-3 z-10">
      <StatBadge label="Lobsters" value={stats.lobsterCount} />
      <StatBadge label="Dialogues" value={stats.activeDialogues} />
      <StatBadge label="Messages" value={stats.totalMessages} />
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm">
      <span className="text-gray-400">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
