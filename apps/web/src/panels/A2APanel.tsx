import { memo, useState } from 'react';
import { useWorldStore } from '../store/useWorldStore';
import type { A2AMessageType } from '@lobster-world/protocol';

const TYPE_LABELS: Partial<Record<A2AMessageType, string>> = {
  task_delegate: 'Task',
  review_request: 'Review',
  knowledge_share: 'Knowledge',
  collab_invite: 'Collab',
  task_accept: 'Accept',
  task_reject: 'Reject',
  task_complete: 'Complete',
  review_response: 'Review Reply',
  knowledge_ack: 'Ack',
  ping: 'Ping',
  pong: 'Pong',
};

const TYPE_COLORS: Partial<Record<A2AMessageType, string>> = {
  task_delegate: 'text-blue-400',
  review_request: 'text-purple-400',
  knowledge_share: 'text-green-400',
  collab_invite: 'text-amber-400',
  task_accept: 'text-emerald-400',
  task_reject: 'text-red-400',
  task_complete: 'text-cyan-400',
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const ActivityItem = memo(function ActivityItem({ activity }: { activity: { type: A2AMessageType; summary: string; timestamp: number } }) {
  const label = TYPE_LABELS[activity.type] ?? activity.type;
  const colorClass = TYPE_COLORS[activity.type] ?? 'text-gray-400';

  return (
    <div className="flex gap-2 items-start py-1 px-2 text-xs">
      <span className={`font-mono font-bold ${colorClass} flex-shrink-0 w-16 truncate`}>
        {label}
      </span>
      <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">{formatTime(activity.timestamp)}</span>
      <span className="text-gray-700 dark:text-gray-300 truncate">{activity.summary}</span>
    </div>
  );
});

export function A2APanel() {
  const activities = useWorldStore((s) => s.a2aActivities);
  const connections = useWorldStore((s) => s.a2aConnections);
  const collabSessions = useWorldStore((s) => s.a2aCollabSessions);
  const [isOpen, setIsOpen] = useState(false);

  const activeCount = connections.length;
  const collabCount = collabSessions.length;

  return (
    <div className="absolute bottom-3 right-3 z-10 w-72 hidden md:block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full panel-glass px-3 py-2 rounded-t-lg text-sm font-medium flex justify-between items-center hover:opacity-90 transition-colors"
      >
        <span>A2A Protocol</span>
        <span className="opacity-50 text-xs">
          {activeCount > 0 && `${activeCount} active `}
          {collabCount > 0 && `${collabCount} collab `}
          {activities.length} msgs {isOpen ? '\u25BC' : '\u25B2'}
        </span>
      </button>

      {isOpen && (
        <div className="panel-glass rounded-b-lg max-h-60 overflow-y-auto border-t-0">
          {activities.length === 0 ? (
            <div className="opacity-50 text-sm p-3 text-center">No A2A activity yet</div>
          ) : (
            <div className="divide-y divide-gray-300/20 dark:divide-gray-700/50">
              {[...activities].reverse().map((a) => (
                <ActivityItem key={a.id} activity={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
