// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useWorldStore } from '../src/store/useWorldStore';

// Track onCreated callback
let capturedOnCreated: ((state: unknown) => void) | undefined;

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated }: { children: React.ReactNode; onCreated?: (state: unknown) => void }) => {
    capturedOnCreated = onCreated;
    return <div data-testid="canvas">{children}</div>;
  },
  useFrame: vi.fn(),
  useThree: () => ({ camera: { position: { lerp: vi.fn() } } }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Grid: () => null,
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Sparkles: () => null,
}));

vi.mock('../src/components/Office', () => ({
  Office: () => <div data-testid="office" />,
}));
vi.mock('../src/components/LobsterRenderer', () => ({
  LobsterRenderer: () => <div data-testid="lobster-renderer" />,
}));
vi.mock('../src/components/CameraController', () => ({
  CameraController: () => null,
}));
vi.mock('../src/components/Particles', () => ({
  Particles: () => null,
}));
vi.mock('../src/components/DialogueConnections', () => ({
  DialogueConnections: () => null,
}));
vi.mock('../src/components/A2AConnections', () => ({
  A2AConnections: () => null,
}));
vi.mock('../src/components/LobsterDetailCard', () => ({
  LobsterDetailCard: () => null,
}));

// Default: WebGL available
vi.mock('../src/lib/webgl', () => ({
  isWebGLAvailable: vi.fn(() => true),
  getWebGLUnavailableReason: vi.fn(() => 'No WebGL'),
}));

import { Scene, SCENE_RENDER_TIMEOUT_MS, SCENE_MOUNT_DELAY_MS } from '../src/components/Scene';
import { isWebGLAvailable } from '../src/lib/webgl';

describe('Scene', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedOnCreated = undefined;
    useWorldStore.setState({ theme: 'dark' });
    vi.mocked(isWebGLAvailable).mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports timeout constants', () => {
    expect(SCENE_RENDER_TIMEOUT_MS).toBe(5000);
    expect(SCENE_MOUNT_DELAY_MS).toBe(100);
  });

  it('shows loading UI before canvas mounts', () => {
    render(<Scene />);
    expect(screen.getByTestId('scene-loading')).toBeDefined();
    expect(screen.getByText('Initializing Lobster World...')).toBeDefined();
  });

  it('mounts Canvas after mount delay', () => {
    render(<Scene />);
    expect(screen.queryByTestId('canvas')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(SCENE_MOUNT_DELAY_MS);
    });

    expect(screen.getByTestId('canvas')).toBeDefined();
  });

  it('hides loading UI after onCreated fires', () => {
    render(<Scene />);

    act(() => {
      vi.advanceTimersByTime(SCENE_MOUNT_DELAY_MS);
    });

    expect(screen.getByTestId('scene-loading')).toBeDefined();

    // Simulate Canvas onCreated
    const mockCanvas = document.createElement('canvas');
    act(() => {
      capturedOnCreated?.({
        gl: {
          domElement: mockCanvas,
        },
      });
    });

    expect(screen.queryByTestId('scene-loading')).toBeNull();
  });

  it('shows render-failed fallback after timeout', () => {
    render(<Scene />);

    act(() => {
      vi.advanceTimersByTime(SCENE_MOUNT_DELAY_MS);
    });

    // Advance past the render timeout without calling onCreated
    act(() => {
      vi.advanceTimersByTime(SCENE_RENDER_TIMEOUT_MS);
    });

    expect(screen.getByTestId('scene-render-failed')).toBeDefined();
    expect(screen.getByText('3D Scene Could Not Load')).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('retry button resets state', () => {
    render(<Scene />);

    // Mount canvas
    act(() => {
      vi.advanceTimersByTime(SCENE_MOUNT_DELAY_MS);
    });

    // Let timeout fire
    act(() => {
      vi.advanceTimersByTime(SCENE_RENDER_TIMEOUT_MS);
    });

    expect(screen.getByTestId('scene-render-failed')).toBeDefined();

    // Click retry
    act(() => {
      screen.getByText('Retry').click();
    });

    // After retry, should show loading again
    expect(screen.getByTestId('scene-loading')).toBeDefined();

    // Canvas remounts after delay
    act(() => {
      vi.advanceTimersByTime(SCENE_MOUNT_DELAY_MS);
    });

    expect(screen.getByTestId('canvas')).toBeDefined();
  });

  it('shows WebGL unavailable message when not supported', () => {
    vi.mocked(isWebGLAvailable).mockReturnValue(false);
    render(<Scene />);
    expect(screen.getByText('WebGL Not Available')).toBeDefined();
  });

  it('does not show failed state if onCreated fires before timeout', () => {
    render(<Scene />);

    act(() => {
      vi.advanceTimersByTime(SCENE_MOUNT_DELAY_MS);
    });

    // Fire onCreated before timeout
    const mockCanvas = document.createElement('canvas');
    act(() => {
      capturedOnCreated?.({
        gl: { domElement: mockCanvas },
      });
    });

    // Now advance past the timeout
    act(() => {
      vi.advanceTimersByTime(SCENE_RENDER_TIMEOUT_MS);
    });

    // Should NOT show failed state
    expect(screen.queryByTestId('scene-render-failed')).toBeNull();
    expect(screen.getByTestId('canvas')).toBeDefined();
  });

  it('applies dark theme background', () => {
    useWorldStore.setState({ theme: 'dark' });
    render(<Scene />);

    act(() => {
      vi.advanceTimersByTime(SCENE_MOUNT_DELAY_MS);
    });

    const mockCanvas = document.createElement('canvas');
    act(() => {
      capturedOnCreated?.({ gl: { domElement: mockCanvas } });
    });

    const container = screen.getByTestId('canvas').parentElement;
    expect(container?.style.background).toBe('rgb(26, 26, 46)');
  });

  it('applies light theme background', () => {
    useWorldStore.setState({ theme: 'light' });
    render(<Scene />);

    act(() => {
      vi.advanceTimersByTime(SCENE_MOUNT_DELAY_MS);
    });

    const mockCanvas = document.createElement('canvas');
    act(() => {
      capturedOnCreated?.({ gl: { domElement: mockCanvas } });
    });

    const container = screen.getByTestId('canvas').parentElement;
    expect(container?.style.background).toBe('rgb(232, 240, 254)');
  });
});
