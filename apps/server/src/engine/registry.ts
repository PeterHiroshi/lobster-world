import type {
  PublicProfile,
  LobsterState,
  StatusType,
  LobsterSkin,
} from '@lobster-world/protocol';
import {
  CUSTOMIZATION_MAX_PRESETS,
  CUSTOMIZATION_HEX_COLOR_REGEX,
} from '@lobster-world/protocol';

const SPAWN_RANGE_X = 10;
const SPAWN_RANGE_Z = 10;

export class LobsterRegistry {
  private lobsters: Map<string, LobsterState> = new Map();
  private tokens: Map<string, string> = new Map();
  private skinPresets: Map<string, LobsterSkin[]> = new Map();

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
    this.skinPresets.delete(lobsterId);
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

  updateSkin(lobsterId: string, skin: LobsterSkin): LobsterState | undefined {
    const existing = this.lobsters.get(lobsterId);
    if (!existing) return undefined;

    if (!CUSTOMIZATION_HEX_COLOR_REGEX.test(skin.bodyColor)) return undefined;
    if (skin.claw1Color && !CUSTOMIZATION_HEX_COLOR_REGEX.test(skin.claw1Color)) return undefined;
    if (skin.claw2Color && !CUSTOMIZATION_HEX_COLOR_REGEX.test(skin.claw2Color)) return undefined;
    if (skin.eyeColor && !CUSTOMIZATION_HEX_COLOR_REGEX.test(skin.eyeColor)) return undefined;

    const validated: LobsterSkin = {
      ...skin,
      lobsterId,
    };

    const updated: LobsterState = { ...existing, skin: validated };
    this.lobsters.set(lobsterId, updated);
    return updated;
  }

  getCustomizationPresets(lobsterId: string): LobsterSkin[] {
    return this.skinPresets.get(lobsterId) ?? [];
  }

  savePreset(lobsterId: string, skin: LobsterSkin): boolean {
    if (!this.lobsters.has(lobsterId)) return false;
    if (!CUSTOMIZATION_HEX_COLOR_REGEX.test(skin.bodyColor)) return false;

    const presets = this.skinPresets.get(lobsterId) ?? [];
    if (presets.length >= CUSTOMIZATION_MAX_PRESETS) return false;

    presets.push({ ...skin, lobsterId });
    this.skinPresets.set(lobsterId, presets);
    return true;
  }

  deletePreset(lobsterId: string, skinId: string): boolean {
    const presets = this.skinPresets.get(lobsterId);
    if (!presets) return false;

    const idx = presets.findIndex((p) => p.id === skinId);
    if (idx === -1) return false;

    presets.splice(idx, 1);
    return true;
  }
}
