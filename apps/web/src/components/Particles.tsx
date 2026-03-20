import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import type { Group } from 'three';
import { useWorldStore } from '../store/useWorldStore';
import type { EffectEntry } from '../store/useWorldStore';

const CONFETTI_COUNT = 20;
const CONFETTI_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94'];
const GRAVITY = 4.9;

interface ConfettiPiece {
  vx: number;
  vy: number;
  vz: number;
  color: string;
}

const ConfettiEffect = memo(function ConfettiEffect({ effect }: { effect: EffectEntry }) {
  const groupRef = useRef<Group>(null);
  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: CONFETTI_COUNT }, () => ({
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        vz: (Math.random() - 0.5) * 3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      })),
    [],
  );

  useFrame(() => {
    if (!groupRef.current) return;
    const elapsed = (Date.now() - effect.startTime) / 1000;
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const p = pieces[i];
      children[i].position.x = p.vx * elapsed;
      children[i].position.y = p.vy * elapsed - GRAVITY * elapsed * elapsed;
      children[i].position.z = p.vz * elapsed;
      children[i].rotation.x = elapsed * 3 + i;
      children[i].rotation.z = elapsed * 2 + i * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[effect.position.x, effect.position.y + 0.5, effect.position.z]}>
      {pieces.map((piece, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.04, 0.04, 0.01]} />
          <meshStandardMaterial color={piece.color} />
        </mesh>
      ))}
    </group>
  );
});

const SparkleEffect = memo(function SparkleEffect({ effect }: { effect: EffectEntry }) {
  return (
    <group position={[effect.position.x, effect.position.y, effect.position.z]}>
      <Sparkles
        count={20}
        scale={1.5}
        size={3}
        speed={2}
        color="#ffd700"
      />
    </group>
  );
});

const AmbientDust = memo(function AmbientDust() {
  return (
    <Sparkles
      count={40}
      scale={20}
      size={1}
      speed={0.3}
      opacity={0.3}
      color="#ffffff"
    />
  );
});

export const Particles = memo(function Particles() {
  const effects = useWorldStore((s) => s.effects);

  return (
    <>
      <AmbientDust />
      {effects.map((effect) => {
        switch (effect.type) {
          case 'confetti':
            return <ConfettiEffect key={effect.id} effect={effect} />;
          case 'sparkle':
            return <SparkleEffect key={effect.id} effect={effect} />;
          default:
            return null;
        }
      })}
    </>
  );
});
