import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useWorldStore } from '../store/useWorldStore';
import { CAMERA_FOCUS_OFFSET, CAMERA_LERP_FACTOR } from '../lib/constants';

const targetPos = new Vector3();
const offset = new Vector3(...CAMERA_FOCUS_OFFSET);

export function CameraController() {
  const { camera } = useThree();
  const focusLobsterId = useWorldStore((s) => s.focusLobsterId);
  const isAnimating = useRef(false);

  useFrame(() => {
    if (!focusLobsterId) {
      isAnimating.current = false;
      return;
    }

    // Read lobster position directly from store to avoid subscribing to all lobsters
    const lobster = useWorldStore.getState().lobsters[focusLobsterId];
    if (!lobster) return;

    targetPos.set(
      lobster.position.x + offset.x,
      lobster.position.y + offset.y,
      lobster.position.z + offset.z,
    );

    camera.position.lerp(targetPos, CAMERA_LERP_FACTOR);
    isAnimating.current = true;
  });

  return null;
}
