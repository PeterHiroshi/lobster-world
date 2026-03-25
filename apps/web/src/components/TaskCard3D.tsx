import { memo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { Task } from '@lobster-world/protocol';
import { TASK_PRIORITY_COLORS } from '@lobster-world/protocol';
import { useWorldStore } from '../store/useWorldStore';

interface TaskCard3DProps {
  task: Task;
  position: [number, number, number];
}

const CARD_WIDTH = 2.5;
const CARD_HEIGHT = 0.4;
const CARD_DEPTH = 0.05;
const HOVER_Z_OFFSET = 0.08;
const LERP_SPEED = 8;
const PULSE_SPEED = 4;
const PULSE_MIN_INTENSITY = 0.6;
const PRIORITY_STRIP_WIDTH = 0.15;

const TaskCard3DInner = ({ task, position }: TaskCard3DProps) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const currentZ = useRef(0);
  const setSelectedTask = useWorldStore((state) => state.setSelectedTask);
  const taskAnimations = useWorldStore((state) => state.taskAnimations);

  const color = TASK_PRIORITY_COLORS[task.priority];
  const hasAnimation = taskAnimations.some((a) => a.taskId === task.id);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    // Smooth hover z-offset
    const targetZ = hovered ? HOVER_Z_OFFSET : 0;
    currentZ.current += (targetZ - currentZ.current) * Math.min(LERP_SPEED * delta, 1);
    meshRef.current.position.z = currentZ.current;

    // Pulse/glow effect for animated tasks
    if (hasAnimation) {
      const material = meshRef.current.material;
      if ('emissiveIntensity' in material) {
        const pulse =
          PULSE_MIN_INTENSITY +
          (1 - PULSE_MIN_INTENSITY) *
            (0.5 + 0.5 * Math.sin(_state.clock.elapsedTime * PULSE_SPEED));
        (material as { emissiveIntensity: number }).emissiveIntensity = pulse;
      }
    }
  });

  const handleClick = () => {
    setSelectedTask(task.id);
  };

  return (
    <group position={position}>
      {/* Card background */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={color}
          emissiveIntensity={hasAnimation ? 0.6 : 0.05}
        />
      </mesh>
      {/* Priority color strip on left edge */}
      <mesh position={[-(CARD_WIDTH / 2) + PRIORITY_STRIP_WIDTH / 2, 0, CARD_DEPTH / 2 + 0.001]}>
        <boxGeometry args={[PRIORITY_STRIP_WIDTH, CARD_HEIGHT, 0.01]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};

export const TaskCard3D = memo(TaskCard3DInner);
