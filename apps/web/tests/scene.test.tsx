// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => {
    return <div data-testid="canvas">{children}</div>;
  },
}));

import { Scene } from '../src/components/Scene';

describe('Scene', () => {
  it('renders the canvas immediately', () => {
    render(<Scene />);
    expect(screen.getByTestId('canvas')).toBeDefined();
  });

  it('renders a mesh (box geometry)', () => {
    const { container } = render(<Scene />);
    expect(container.querySelector('mesh')).toBeDefined();
  });
});
