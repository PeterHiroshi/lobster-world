// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useWorldStore } from '../src/store/useWorldStore';

// Mock matchMedia for useMediaQuery
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock R3F
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

vi.mock('../src/lib/audio', () => ({
  playChatPing: vi.fn(),
  playJoinSound: vi.fn(),
  playTypingClick: vi.fn(),
  setMuted: vi.fn(),
  getMuted: () => true,
}));

const startDemoScenario = vi.fn();
const stopDemoScenario = vi.fn();
vi.mock('../src/lib/DemoScenario', () => ({
  startDemoScenario,
  stopDemoScenario,
}));

vi.mock('../src/lib/DemoSocialProxy', () => ({
  DemoSocialProxy: vi.fn(),
}));

vi.mock('../src/components/MiniLobster', () => ({
  MiniLobster: () => null,
}));

vi.mock('../src/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

// Lazy Scene mock
vi.mock('../src/components/Scene', () => ({
  Scene: () => <div data-testid="scene">Scene</div>,
}));

describe('Demo mode bypasses WebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorldStore.setState({
      lobbyState: { phase: 'landing', profile: null, sessionToken: null, error: null },
      connectionStatus: 'disconnected',
    });
  });

  afterEach(() => {
    stopDemoScenario();
  });

  it('handleWatchDemo sets phase to joined without WS connection', async () => {
    const { App } = await import('../src/App');
    render(<App />);

    const demoButton = screen.getByTestId('landing-demo');
    fireEvent.click(demoButton);

    const state = useWorldStore.getState();
    expect(state.lobbyState.phase).toBe('joined');
    expect(state.lobbyState.sessionToken).toBe('demo-visitor');
  });

  it('handleWatchDemo calls startDemoScenario immediately', async () => {
    const { App } = await import('../src/App');
    render(<App />);

    fireEvent.click(screen.getByTestId('landing-demo'));

    expect(startDemoScenario).toHaveBeenCalledTimes(1);
  });

  it('handleWatchDemo does not instantiate DemoSocialProxy', async () => {
    const { DemoSocialProxy } = await import('../src/lib/DemoSocialProxy');
    const { App } = await import('../src/App');
    render(<App />);

    fireEvent.click(screen.getByTestId('landing-demo'));

    expect(DemoSocialProxy).not.toHaveBeenCalled();
  });
});
