import type {
  SocialProfile,
  BudgetConfig,
  SocialPermissionPolicy,
  LobbyJoinResult,
  Scene,
} from '@lobster-world/protocol';
import crypto from 'node:crypto';

export interface LobsterLobbyEntry {
  profile: SocialProfile;
  budgetConfig: BudgetConfig;
  permissions: SocialPermissionPolicy;
  sessionToken: string;
  joinedAt: number;
}

export class LobbyManager {
  private scene: Scene;
  private entries = new Map<string, LobsterLobbyEntry>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  processJoinRequest(
    profile: SocialProfile,
    budgetConfig: BudgetConfig,
    permissions: SocialPermissionPolicy,
  ): LobbyJoinResult {
    // Validate profile
    if (!profile.lobsterId || !profile.displayName) {
      return {
        success: false,
        reason: 'Profile must include lobsterId and displayName',
      };
    }

    // Check duplicate
    if (this.entries.has(profile.lobsterId)) {
      return {
        success: false,
        reason: `Lobster ${profile.lobsterId} is already in the lobby`,
      };
    }

    // Check capacity
    if (this.entries.size >= this.scene.capacity) {
      return {
        success: false,
        reason: 'Scene is at capacity',
      };
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');

    this.entries.set(profile.lobsterId, {
      profile,
      budgetConfig,
      permissions,
      sessionToken,
      joinedAt: Date.now(),
    });

    return {
      success: true,
      sessionToken,
      scene: this.scene,
    };
  }

  getLobsterEntry(lobsterId: string): LobsterLobbyEntry | undefined {
    return this.entries.get(lobsterId);
  }

  getPermissions(lobsterId: string): SocialPermissionPolicy | undefined {
    return this.entries.get(lobsterId)?.permissions;
  }

  getBudgetConfig(lobsterId: string): BudgetConfig | undefined {
    return this.entries.get(lobsterId)?.budgetConfig;
  }

  removeLobster(lobsterId: string): void {
    this.entries.delete(lobsterId);
  }

  getOccupancy(): number {
    return this.entries.size;
  }

  isInLobby(lobsterId: string): boolean {
    return this.entries.has(lobsterId);
  }
}
