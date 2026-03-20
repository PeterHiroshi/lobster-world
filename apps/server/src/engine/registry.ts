import type {
  PublicProfile,
  LobsterState,
  StatusType,
} from '@lobster-world/protocol';

const SPAWN_RANGE_X = 10;
const SPAWN_RANGE_Z = 10;

export class LobsterRegistry {
  private lobsters: Map<string, LobsterState> = new Map();
  private tokens: Map<string, string> = new Map();

  register(profile: PublicProfile, token: string): LobsterState {
    const state: LobsterState = {
      id: profile.id,
      profile,
      position: {
        x: Math.random() * SPAWN_RANGE_X,
        y: 0,
        z: Math.random() * SPAWN_RANGE_Z,
      },
      rotation: 0,
      animation: 'idle',
      status: 'online',
      mood: 'neutral',
    };

    this.lobsters.set(profile.id, state);
    this.tokens.set(profile.id, token);

    return state;
  }

  unregister(lobsterId: string): void {
    this.lobsters.delete(lobsterId);
    this.tokens.delete(lobsterId);
  }

  validateToken(lobsterId: string, token: string): boolean {
    return this.tokens.get(lobsterId) === token;
  }

  getLobster(lobsterId: string): LobsterState | undefined {
    return this.lobsters.get(lobsterId);
  }

  getAllLobsters(): LobsterState[] {
    return Array.from(this.lobsters.values());
  }

  getOnlineLobsters(): LobsterState[] {
    return Array.from(this.lobsters.values()).filter(
      (lobster) => lobster.status !== 'offline'
    );
  }

  updateState(
    lobsterId: string,
    partial: Partial<LobsterState>
  ): LobsterState | undefined {
    const existing = this.lobsters.get(lobsterId);
    if (!existing) {
      return undefined;
    }

    const { id: _id, profile: _profile, ...safePartial } = partial;

    const updated: LobsterState = { ...existing, ...safePartial };
    this.lobsters.set(lobsterId, updated);

    return updated;
  }

  setStatus(lobsterId: string, status: StatusType): void {
    const existing = this.lobsters.get(lobsterId);
    if (existing) {
      existing.status = status;
    }
  }

  getLobsterCount(): number {
    return this.lobsters.size;
  }

  isRegistered(lobsterId: string): boolean {
    return this.lobsters.has(lobsterId);
  }
}
