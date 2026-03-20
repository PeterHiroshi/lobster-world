import { memo } from 'react';
import { Grid } from '@react-three/drei';
import { FLOOR_SIZE, DESK_POSITIONS, COFFEE_AREA_POSITION } from '../lib/constants';

function Desk({ position }: { position: [number, number] }) {
  const [x, z] = position;
  return (
    <group position={[x, 0, z]}>
      {/* Desk surface */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.05, 0.8]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>
      {/* Legs */}
      {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.375, lz]}>
          <boxGeometry args={[0.05, 0.75, 0.05]} />
          <meshStandardMaterial color="#6B5210" />
        </mesh>
      ))}
      {/* Monitor */}
      <mesh position={[0, 1.05, -0.2]} castShadow>
        <boxGeometry args={[0.5, 0.35, 0.03]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.87, -0.2]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

function CoffeeArea() {
  const [x, z] = COFFEE_AREA_POSITION;
  return (
    <group position={[x, 0, z]}>
      {/* Coffee area floor patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
      {/* Coffee table */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>
      {/* Table leg */}
      <mesh position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.45, 8]} />
        <meshStandardMaterial color="#4a2e15" />
      </mesh>
    </group>
  );
}

export const Office = memo(function Office() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      {/* Grid overlay */}
      <Grid
        args={[FLOOR_SIZE, FLOOR_SIZE]}
        position={[0, 0.001, 0]}
        cellSize={1}
        cellColor="#d1d5db"
        sectionSize={5}
        sectionColor="#9ca3af"
        fadeDistance={25}
        infiniteGrid={false}
      />

      {/* Desks */}
      {DESK_POSITIONS.map((pos, i) => (
        <Desk key={i} position={pos} />
      ))}

      {/* Coffee area */}
      <CoffeeArea />
    </group>
  );
});
