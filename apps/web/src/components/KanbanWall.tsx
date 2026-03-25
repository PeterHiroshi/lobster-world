import { memo } from 'react';
import type { Task, TaskStatus } from '@lobster-world/protocol';
import { KANBAN_WALL_POSITION } from '@lobster-world/protocol';
import { useWorldStore } from '../store/useWorldStore';
import { TaskCard3D } from './TaskCard3D';

const WALL_WIDTH = 12;
const WALL_HEIGHT = 4;
const WALL_DEPTH = 0.1;
const WALL_Y_CENTER = 2;

const CARD_START_Y = 3.2;
const CARD_SPACING = 0.5;

const COLUMN_HEADER_Y = 3.8;
const COLUMN_HEADER_WIDTH = 2.0;
const COLUMN_HEADER_HEIGHT = 0.3;
const COLUMN_HEADER_DEPTH = 0.02;

const COLUMNS: { status: TaskStatus; label: string; xOffset: number; color: string }[] = [
  { status: 'todo', label: 'Todo', xOffset: -4.5, color: '#94a3b8' },
  { status: 'doing', label: 'Doing', xOffset: -1.5, color: '#3b82f6' },
  { status: 'review', label: 'Review', xOffset: 1.5, color: '#f59e0b' },
  { status: 'done', label: 'Done', xOffset: 4.5, color: '#22c55e' },
];

const KanbanWallInner = () => {
  const tasks = useWorldStore((state) => state.tasks);

  const tasksByStatus: Record<TaskStatus, Task[]> = {
    todo: [],
    doing: [],
    review: [],
    done: [],
  };

  for (const task of Object.values(tasks)) {
    tasksByStatus[task.status].push(task);
  }

  const wallX = KANBAN_WALL_POSITION.x;
  const wallY = KANBAN_WALL_POSITION.y;
  const wallZ = KANBAN_WALL_POSITION.z;

  return (
    <group position={[wallX, wallY, wallZ]}>
      {/* Physical wall */}
      <mesh position={[0, WALL_Y_CENTER, 0]}>
        <boxGeometry args={[WALL_WIDTH, WALL_HEIGHT, WALL_DEPTH]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>

      {/* Column headers (colored strips instead of text) and task cards */}
      {COLUMNS.map((column) => (
        <group key={column.status}>
          {/* Column header — colored strip */}
          <mesh position={[column.xOffset, COLUMN_HEADER_Y, WALL_DEPTH / 2 + 0.01]}>
            <boxGeometry args={[COLUMN_HEADER_WIDTH, COLUMN_HEADER_HEIGHT, COLUMN_HEADER_DEPTH]} />
            <meshStandardMaterial color={column.color} />
          </mesh>

          {/* Task cards */}
          {tasksByStatus[column.status].map((task, index) => (
            <TaskCard3D
              key={task.id}
              task={task}
              position={[
                column.xOffset,
                CARD_START_Y - index * CARD_SPACING,
                WALL_DEPTH / 2 + 0.04,
              ]}
            />
          ))}
        </group>
      ))}
    </group>
  );
};

export const KanbanWall = memo(KanbanWallInner);
