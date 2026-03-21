// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useWorldStore } from '../src/store/useWorldStore';
import { PermissionRequestOverlay } from '../src/components/PermissionRequestOverlay';
import type { PermissionRequest } from '@lobster-world/protocol';

vi.mock('../src/lib/audio', () => ({
  playChatPing: vi.fn(),
  playJoinSound: vi.fn(),
  playTypingClick: vi.fn(),
  setMuted: vi.fn(),
  getMuted: () => true,
}));

function makeRequest(overrides: Partial<PermissionRequest> = {}): PermissionRequest {
  return {
    id: 'perm-1',
    requesterId: 'lobster-2',
    requesterName: 'Suki',
    requesterColor: '#4ecdc4',
    dataType: 'skills',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('PermissionRequestOverlay', () => {
  beforeEach(() => {
    useWorldStore.setState({ permissionRequests: [] });
  });

  it('renders nothing when no requests', () => {
    const { container } = render(<PermissionRequestOverlay />);
    expect(container.querySelector('[data-testid="permission-overlay"]')).toBeNull();
  });

  it('renders a permission card for each request', () => {
    useWorldStore.setState({
      permissionRequests: [
        makeRequest({ id: 'p1' }),
        makeRequest({ id: 'p2', requesterName: 'Phil', dataType: 'activity' }),
      ],
    });
    render(<PermissionRequestOverlay />);
    expect(screen.getByTestId('permission-card-p1')).toBeDefined();
    expect(screen.getByTestId('permission-card-p2')).toBeDefined();
  });

  it('shows requester name and data type', () => {
    useWorldStore.setState({ permissionRequests: [makeRequest()] });
    render(<PermissionRequestOverlay />);
    expect(screen.getByText('Suki')).toBeDefined();
    expect(screen.getByText('skills')).toBeDefined();
  });

  it('removes request on Allow click', () => {
    useWorldStore.setState({ permissionRequests: [makeRequest()] });
    render(<PermissionRequestOverlay />);
    fireEvent.click(screen.getByTestId('perm-allow-perm-1'));
    expect(useWorldStore.getState().permissionRequests).toHaveLength(0);
  });
});
