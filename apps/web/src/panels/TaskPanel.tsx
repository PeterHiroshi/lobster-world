import { memo } from 'react';
import type { TaskStatus, TaskPriority } from '@lobster-world/protocol';
import { TASK_PRIORITY_COLORS } from '@lobster-world/protocol';
import { useWorldStore } from '../store/useWorldStore';

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  doing: '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  doing: 'In Progress',
  review: 'In Review',
  done: 'Done',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TaskPanel = memo(function TaskPanel() {
  const selectedTaskId = useWorldStore((s) => s.selectedTaskId);
  const tasks = useWorldStore((s) => s.tasks);
  const setSelectedTask = useWorldStore((s) => s.setSelectedTask);
  const teamAgents = useWorldStore((s) => s.teamAgents);

  if (!selectedTaskId) return null;

  const task = tasks[selectedTaskId];
  if (!task) return null;

  const assignee = task.assigneeId
    ? teamAgents.find((a) => a.id === task.assigneeId)
    : undefined;

  return (
    <div className="absolute top-32 right-3 z-10 w-72 bg-gray-900/90 backdrop-blur rounded-lg p-4 text-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold leading-tight">{task.title}</h3>
        <button
          onClick={() => setSelectedTask(null)}
          className="text-gray-400 hover:text-white transition-colors flex-shrink-0 text-sm leading-none"
        >
          X
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-gray-400 text-xs mb-3 leading-relaxed">{task.description}</p>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: STATUS_COLORS[task.status],
            color: task.status === 'todo' ? '#1e293b' : '#fff',
          }}
        >
          {STATUS_LABELS[task.status]}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: TASK_PRIORITY_COLORS[task.priority],
            color: task.priority === 'low' ? '#1e293b' : '#fff',
          }}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      {/* Assignee */}
      {assignee && (
        <div className="text-xs text-gray-400 mb-2">
          <span className="text-gray-500">Assignee: </span>
          <span style={{ color: assignee.color }}>{assignee.name}</span>
        </div>
      )}

      {/* Subtasks */}
      {task.subtasks.length > 0 && (
        <div className="text-xs text-gray-400">
          <span className="text-gray-500">Subtasks: </span>
          <span>{task.subtasks.length}</span>
        </div>
      )}
    </div>
  );
});
