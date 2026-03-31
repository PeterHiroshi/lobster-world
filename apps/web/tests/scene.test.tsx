// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated }: { children: React.ReactNode; onCreated?: (state: unknown) => void }) => {
    if (onCreated) {
      const fakeState = {
        gl: {
          domElement: document.createElement('canvas'),
          render: () => {},
        },
        scene: {},
        camera: { position: { x: 0, y: 0, z: 0 } },
      };
      setTimeout(() => onCreated(fakeState), 0);
    }
    return <div data-testid="canvas">{children}</div>;
  },
  useThree: () => ({ camera: { position: { x: 0, y: 0, z: 0, copy: () => ({ x: 0, y: 0, z: 0, sub: () => ({ normalize: () => ({ x: 0, y: 0, z: 0 }) }) }) } } }),
  useFrame: () => {},
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Grid: () => null,
  Text: () => null,
  Sparkles: () => null,
  Line: () => null,
  Html: () => null,
}));

vi.mock('../src/lib/webgl', () => ({
  isWebGLAvailable: () => true,
  getWebGLUnavailableReason: () => 'Mocked',
}));

import { Scene } from '../src/components/Scene';

describe('Scene', () => {
  it('renders the canvas immediately', () => {
    render(<Scene />);
    expect(screen.getByTestId('canvas')).toBeDefined();
  });

  it('renders the scene wrapper with background', () => {
    const { container } = render(<Scene />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toBeDefined();
    expect(wrapper.style.background).toBeTruthy();
  });
});
