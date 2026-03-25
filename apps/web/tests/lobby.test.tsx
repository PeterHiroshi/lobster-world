// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useWorldStore } from '../src/store/useWorldStore';
import { LobbyScreen } from '../src/components/LobbyScreen';

vi.mock('../src/lib/audio', () => ({
  playChatPing: vi.fn(),
  playJoinSound: vi.fn(),
  playTypingClick: vi.fn(),
  setMuted: vi.fn(),
  getMuted: () => true,
}));

describe('LobbyScreen', () => {
  const onJoin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWorldStore.setState({
      lobbyState: { phase: 'lobby', profile: null, sessionToken: null, error: null },
      connectionStatus: 'connected',
    });
  });

  it('renders lobby form elements', () => {
    render(<LobbyScreen onJoin={onJoin} />);
    expect(screen.getByTestId('display-name-input')).toBeDefined();
    expect(screen.getByTestId('color-picker')).toBeDefined();
    expect(screen.getByTestId('bio-input')).toBeDefined();
    expect(screen.getByTestId('skill-tags')).toBeDefined();
    expect(screen.getByTestId('daily-token-slider')).toBeDefined();
    expect(screen.getByTestId('session-token-slider')).toBeDefined();
    expect(screen.getByTestId('permission-select')).toBeDefined();
    expect(screen.getByTestId('enter-world-button')).toBeDefined();
    expect(screen.getByTestId('lobster-preview')).toBeDefined();
  });

  it('disables submit when display name is empty', () => {
    render(<LobbyScreen onJoin={onJoin} />);
    const button = screen.getByTestId('enter-world-button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('calls onJoin with profile when form is filled', () => {
    render(<LobbyScreen onJoin={onJoin} />);
    const input = screen.getByTestId('display-name-input');
    fireEvent.change(input, { target: { value: 'TestLobster' } });

    const button = screen.getByTestId('enter-world-button');
    fireEvent.click(button);

    expect(onJoin).toHaveBeenCalledTimes(1);
    const profile = onJoin.mock.calls[0][0];
    expect(profile.displayName).toBe('TestLobster');
    expect(profile.color).toBeDefined();
    expect(profile.permissionPreset).toBe('selective');
  });

  it('toggles skill selection', () => {
    render(<LobbyScreen onJoin={onJoin} />);
    const codingBtn = screen.getByTestId('skill-coding');
    fireEvent.click(codingBtn);

    // Fill name and submit to verify skills in profile
    fireEvent.change(screen.getByTestId('display-name-input'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByTestId('enter-world-button'));

    const profile = onJoin.mock.calls[0][0];
    expect(profile.skills).toContain('coding');
  });

  it('shows error from lobby state', () => {
    useWorldStore.setState({
      lobbyState: { phase: 'lobby', profile: null, sessionToken: null, error: 'Auth failed' },
    });
    render(<LobbyScreen onJoin={onJoin} />);
    expect(screen.getByTestId('lobby-error').textContent).toContain('Auth failed');
  });

  it('shows Joining button text when phase is joining', () => {
    useWorldStore.setState({
      lobbyState: { phase: 'joining', profile: null, sessionToken: null, error: null },
    });
    render(<LobbyScreen onJoin={onJoin} />);
    expect(screen.getByTestId('enter-world-button').textContent).toBe('Joining...');
  });

  it('shows Retry button when error is set and phase is lobby', () => {
    useWorldStore.setState({
      lobbyState: { phase: 'lobby', profile: null, sessionToken: null, error: 'Connection failed' },
    });
    render(<LobbyScreen onJoin={onJoin} />);
    const retryBtn = screen.getByTestId('retry-button');
    expect(retryBtn).toBeDefined();
    expect(retryBtn.textContent).toBe('Retry');
  });

  it('Retry button calls onJoin with current form values', () => {
    useWorldStore.setState({
      lobbyState: { phase: 'lobby', profile: null, sessionToken: null, error: 'Connection failed' },
    });
    render(<LobbyScreen onJoin={onJoin} />);

    // Fill in name first
    fireEvent.change(screen.getByTestId('display-name-input'), { target: { value: 'RetryLobster' } });

    fireEvent.click(screen.getByTestId('retry-button'));
    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(onJoin.mock.calls[0][0].displayName).toBe('RetryLobster');
  });

  it('does not show Retry button when no error', () => {
    useWorldStore.setState({
      lobbyState: { phase: 'lobby', profile: null, sessionToken: null, error: null },
    });
    render(<LobbyScreen onJoin={onJoin} />);
    expect(screen.queryByTestId('retry-button')).toBeNull();
  });
});
