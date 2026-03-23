import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import { Frustum, Matrix4, Vector3 } from 'three';
import {
  LOD_HIGH_DISTANCE,
  LOD_MEDIUM_DISTANCE,
  FRUSTUM_CULL_MARGIN,
} from '../lib/constants';

export type LODLevel = 'high' | 'medium' | 'low';

interface LODState {
  level: LODLevel;
  visible: boolean;
  distance: number;
}

const _frustum = new Frustum();
const _projMatrix = new Matrix4();
const _pos = new Vector3();

/**
 * Computes LOD level and frustum visibility for a lobster group.
 * Returns a ref that is updated every frame with { level, visible, distance }.
 */
export function useLobsterLOD(groupRef: React.RefObject<Group | null>): React.RefObject<LODState> {
  const { camera } = useThree();
  const stateRef = useRef<LODState>({ level: 'high', visible: true, distance: 0 });

  useFrame(() => {
    if (!groupRef.current) return;

    // Calculate distance to camera
    _pos.set(
      groupRef.current.position.x,
      groupRef.current.position.y,
      groupRef.current.position.z,
    );
    const distance = camera.position.distanceTo(_pos);
    stateRef.current.distance = distance;

    // LOD level
    if (distance <= LOD_HIGH_DISTANCE) {
      stateRef.current.level = 'high';
    } else if (distance <= LOD_MEDIUM_DISTANCE) {
      stateRef.current.level = 'medium';
    } else {
      stateRef.current.level = 'low';
    }

    // Frustum culling with margin
    _projMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    _frustum.setFromProjectionMatrix(_projMatrix);

    // Expand test point slightly for margin
    stateRef.current.visible = _frustum.containsPoint(_pos) || distance < FRUSTUM_CULL_MARGIN;
  });

  return stateRef;
}
