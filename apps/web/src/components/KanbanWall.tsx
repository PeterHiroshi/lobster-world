import { memo } from 'react';
import { Text } from '@react-three/drei';
import type { Task, TaskStatus } from '@lobster-world/protocol';
import { KANBAN_WALL_POSITION } from '@lobster-world/protocol';
import { useWorldStore } from '../store/useWorldStore';
import { TaskCard3D } from './TaskCard3D';

const WALL_WIDTH = 12;
const WALL_HEIGHT = 4;
const WALL_DEPTH = 0.1;
const WALL_Y_CENTER = 2;

const COLUMN_HEADER_Y = 3.8;
const CARD_START_Y = 3.2;
const CARD_SPACING = 0.5;

const COLUMNS: { status: TaskStatus; label: string; xOffset: number }[] = [
  { status: 'todo', label: 'Todo', xOffset: -4.5 },
  { status: 'doing', label: 'Doing', xOffset: -1.5 },
  { status: 'review', label: 'Review', xOffset: 1.5 },
  { status: 'done', label: 'Done', xOffset: 4.5 },
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
        <meshBasicMaterial color="#f0f0f0" />
      </mesh>

      {/* Column headers and task cards */}
      {COLUMNS.map((column) => (
        <group key={column.status}>
          {/* Column header */}
          <Text
            position={[column.xOffset, COLUMN_HEADER_Y, WALL_DEPTH / 2 + 0.01]}
            fontSize={0.25}
            color="#333333"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {column.label}
          </Text>

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
