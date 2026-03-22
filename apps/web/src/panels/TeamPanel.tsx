import { memo } from 'react';
import { PRESET_ROLES } from '@lobster-world/protocol';
import { useWorldStore } from '../store/useWorldStore';

function TeamContent() {
  const teamAgents = useWorldStore((s) => s.teamAgents);
  const tasks = useWorldStore((s) => s.tasks);
  const lobsters = useWorldStore((s) => s.lobsters);

  if (teamAgents.length === 0) {
    return <div className="opacity-50 text-xs text-center py-2">No team data</div>;
  }

  return (
    <div className="space-y-2">
      {teamAgents.map((agent) => {
        const role = PRESET_ROLES.find((r) => r.id === agent.roleId);
        const activeTasks = Object.values(tasks).filter(
          (t) => t.assigneeId === agent.id && t.status !== 'done',
        ).length;
        const isOnline = agent.id in lobsters;

        return (
          <div key={agent.id} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: isOnline ? '#22c55e' : '#4b5563' }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {role && <span className="text-xs">{role.icon}</span>}
                <span className="text-xs font-medium truncate" style={{ color: agent.color }}>
                  {agent.name}
                </span>
              </div>
              <div className="opacity-50 text-xs">
                {role ? role.name : agent.roleId}
                {activeTasks > 0 && (
                  <span className="ml-1 opacity-70">
                    ({activeTasks} task{activeTasks !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const TeamPanel = memo(function TeamPanel({ embedded }: { embedded?: boolean }) {
  if (embedded) return <TeamContent />;

  return (
    <div className="absolute bottom-3 left-3 z-10 w-64 panel-glass rounded-lg p-3 hidden md:block">
      <h3 className="text-sm font-bold mb-2">Team</h3>
      <TeamContent />
    </div>
  );
});
