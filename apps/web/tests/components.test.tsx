// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useWorldStore } from '../src/store/useWorldStore';
import { StatsPanel } from '../src/panels/StatsPanel';
import { ConnectionStatus } from '../src/panels/ConnectionStatus';

// Mock R3F since it requires WebGL context
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({ camera: { position: { lerp: vi.fn() } } }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Environment: () => null,
  Grid: () => null,
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('StatsPanel', () => {
  beforeEach(() => {
    useWorldStore.setState({
      stats: { lobsterCount: 3, activeDialogues: 1, totalMessages: 42 },
    });
  });

  it('renders lobster count', () => {
    render(<StatsPanel />);
    expect(screen.getByText('3')).toBeDefined();
  });

  it('renders dialogue count', () => {
    render(<StatsPanel />);
    expect(screen.getByText('1')).toBeDefined();
  });

  it('renders message count', () => {
    render(<StatsPanel />);
    expect(screen.getByText('42')).toBeDefined();
  });
});

describe('ConnectionStatus', () => {
  it('shows connected state', () => {
    useWorldStore.setState({ connectionStatus: 'connected' });
    render(<ConnectionStatus />);
    expect(screen.getByText('Connected')).toBeDefined();
  });

  it('shows disconnected state', () => {
    useWorldStore.setState({ connectionStatus: 'disconnected' });
    render(<ConnectionStatus />);
    expect(screen.getByText('Disconnected')).toBeDefined();
  });

  it('shows connecting state', () => {
    useWorldStore.setState({ connectionStatus: 'connecting' });
    render(<ConnectionStatus />);
    expect(screen.getByText('Connecting...')).toBeDefined();
  });
});
