import { useMemo, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Frustum, Matrix4, Vector3 } from 'three';
import type { LobsterState } from '@lobster-world/protocol';
import { useWorldStore } from '../store/useWorldStore';
import { Lobster } from './Lobster';
import type { LODLevel } from '../hooks/useLobsterLOD';
import {
  LOD_HIGH_DISTANCE,
  LOD_MEDIUM_DISTANCE,
  FRUSTUM_CULL_MARGIN,
} from '../lib/constants';

interface VisibleLobster {
  lobster: LobsterState;
  lod: LODLevel;
}

const _frustum = new Frustum();
const _projMatrix = new Matrix4();
const _pos = new Vector3();

export function LobsterRenderer() {
  const lobsters = useWorldStore((s) => s.lobsters);
  const { camera } = useThree();
  const visibleRef = useRef<VisibleLobster[]>([]);
  const frameCounter = useRef(0);

  // Compute visible lobsters + LOD every 3 frames for performance
  const computeVisible = useCallback(() => {
    _projMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projMatrix);

    const result: VisibleLobster[] = [];
    for (const lobster of Object.values(lobsters)) {
      _pos.set(lobster.position.x, 0.25, lobster.position.z);
      const distance = camera.position.distanceTo(_pos);

      // Frustum culling: skip lobsters outside view (with margin)
      if (!_frustum.containsPoint(_pos) && distance > FRUSTUM_CULL_MARGIN) {
        continue;
      }

      // Determine LOD level
      let lod: LODLevel;
      if (distance <= LOD_HIGH_DISTANCE) {
        lod = 'high';
      } else if (distance <= LOD_MEDIUM_DISTANCE) {
        lod = 'medium';
      } else {
        lod = 'low';
      }

      result.push({ lobster, lod });
    }
    return result;
  }, [lobsters, camera]);

  useFrame(() => {
    frameCounter.current += 1;
    // Update visibility every 3 frames to avoid per-frame overhead
    if (frameCounter.current % 3 === 0) {
      visibleRef.current = computeVisible();
    }
  });

  // Use memo for initial render, then visibleRef takes over
  const initialVisible = useMemo(() => computeVisible(), [computeVisible]);

  const visible = visibleRef.current.length > 0 ? visibleRef.current : initialVisible;

  return (
    <>
      {visible.map(({ lobster, lod }) => (
        <Lobster key={lobster.id} lobster={lobster} lodLevel={lod} />
      ))}
    </>
  );
}
