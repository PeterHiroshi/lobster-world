import { describe, it, expect, beforeEach } from 'vitest';
import { LobbyManager } from '../src/engine/lobby.js';
import type { SocialProfile, BudgetConfig, SocialPermissionPolicy, Scene } from '@lobster-world/protocol';
import { DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY } from '@lobster-world/protocol';

const makeProfile = (id: string): SocialProfile => ({
  lobsterId: id,
  displayName: `Lobster ${id}`,
  avatar: '',
  bio: 'A test lobster',
  skillTags: ['testing'],
  personalitySnippet: 'Friendly',
  status: 'online',
  partition: 'public',
});

const mockScene: Scene = {
  id: 'scene-1',
  name: 'Test Office',
  type: 'office',
  capacity: 5,
  lobsters: {},
  objects: [],
};

describe('LobbyManager', () => {
  let lobby: LobbyManager;

  beforeEach(() => {
    lobby = new LobbyManager(mockScene);
  });

  it('accepts valid join request', () => {
    const result = lobby.processJoinRequest(
      makeProfile('lobster-1'),
      DEFAULT_BUDGET_CONFIG,
      DEFAULT_SOCIAL_PERMISSION_POLICY,
    );
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBeTruthy();
    expect(result.scene).toBeDefined();
  });

  it('rejects when scene is full', () => {
    const fullScene: Scene = { ...mockScene, capacity: 1 };
    const fullLobby = new LobbyManager(fullScene);

    fullLobby.processJoinRequest(makeProfile('l-1'), DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY);
    const result = fullLobby.processJoinRequest(makeProfile('l-2'), DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('capacity');
  });

  it('rejects duplicate lobby entries', () => {
    lobby.processJoinRequest(makeProfile('l-1'), DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY);
    const result = lobby.processJoinRequest(makeProfile('l-1'), DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('already');
  });

  it('validates profile has required fields', () => {
    const badProfile = { ...makeProfile('l-1'), displayName: '' };
    const result = lobby.processJoinRequest(badProfile, DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('displayName');
  });

  it('stores budget config and permissions for admitted lobster', () => {
    lobby.processJoinRequest(makeProfile('l-1'), DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY);
    const entry = lobby.getLobsterEntry('l-1');
    expect(entry).toBeDefined();
    expect(entry!.budgetConfig).toEqual(DEFAULT_BUDGET_CONFIG);
    expect(entry!.permissions).toEqual(DEFAULT_SOCIAL_PERMISSION_POLICY);
  });

  it('removes lobster on leave', () => {
    lobby.processJoinRequest(makeProfile('l-1'), DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY);
    lobby.removeLobster('l-1');
    expect(lobby.getLobsterEntry('l-1')).toBeUndefined();
  });

  it('returns current occupancy', () => {
    lobby.processJoinRequest(makeProfile('l-1'), DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY);
    lobby.processJoinRequest(makeProfile('l-2'), DEFAULT_BUDGET_CONFIG, DEFAULT_SOCIAL_PERMISSION_POLICY);
    expect(lobby.getOccupancy()).toBe(2);
  });

  it('returns permissions for a lobster', () => {
    lobby.processJoinRequest(
      makeProfile('l-1'),
      DEFAULT_BUDGET_CONFIG,
      { ...DEFAULT_SOCIAL_PERMISSION_POLICY, blockList: ['badguy'] },
    );
    const perms = lobby.getPermissions('l-1');
    expect(perms?.blockList).toContain('badguy');
  });
});
