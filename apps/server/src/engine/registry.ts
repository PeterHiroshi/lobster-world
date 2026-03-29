import type {
  PublicProfile,
  LobsterState,
  StatusType,
  LobsterSkin,
  LobsterSource,
} from '@lobster-world/protocol';
import {
  CUSTOMIZATION_MAX_PRESETS,
  CUSTOMIZATION_HEX_COLOR_REGEX,
} from '@lobster-world/protocol';
import type { LobsterRepository } from '../db/repositories/lobster-repo.js';
import type { SkinPresetRepository } from '../db/repositories/skin-preset-repo.js';
import { InMemorySkinPresetRepo } from '../db/repositories/skin-preset-repo.js';

const SPAWN_RANGE_X = 10;
const SPAWN_RANGE_Z = 10;

export interface LobsterRegistryOpts {
  lobsterRepo?: LobsterRepository;
  skinPresetRepo?: SkinPresetRepository;
}

export class LobsterRegistry {
  // Runtime state is always in-memory (positions, animations, etc.)
  // The repos persist profile data and skin presets across restarts
  private lobsters: Map<string, LobsterState> = new Map();
  private tokens: Map<string, string> = new Map();
  private lobsterRepo?: LobsterRepository;
  private skinPresetRepo: SkinPresetRepository;

  constructor(opts?: LobsterRegistryOpts) {
    this.lobsterRepo = opts?.lobsterRepo;
    this.skinPresetRepo = opts?.skinPresetRepo ?? new InMemorySkinPresetRepo();
  }

  register(profile: PublicProfile, token: string, source?: LobsterSource): LobsterState {
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

    // Fire-and-forget persistence of profile data
    if (this.lobsterRepo) {
      this.lobsterRepo.upsert(profile, source).catch(() => {
        // Silently ignore persistence failures — in-memory state is authoritative
      });
    }

    return state;
  }

  unregister(lobsterId: string): void {
    this.lobsters.delete(lobsterId);
    this.tokens.delete(lobsterId);

    if (this.lobsterRepo) {
      this.lobsterRepo.updateStatus(lobsterId, 'offline').catch(() => {});
    }
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
      if (this.lobsterRepo) {
        this.lobsterRepo.updateStatus(lobsterId, status).catch(() => {});
      }
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

  async getCustomizationPresets(lobsterId: string): Promise<LobsterSkin[]> {
    return this.skinPresetRepo.getByLobster(lobsterId);
  }

  async savePreset(lobsterId: string, skin: LobsterSkin): Promise<boolean> {
    if (!this.lobsters.has(lobsterId)) return false;
    if (!CUSTOMIZATION_HEX_COLOR_REGEX.test(skin.bodyColor)) return false;

    const count = await this.skinPresetRepo.count(lobsterId);
    if (count >= CUSTOMIZATION_MAX_PRESETS) return false;
    return this.skinPresetRepo.save(lobsterId, { ...skin, lobsterId });
  }

  async deletePreset(lobsterId: string, skinId: string): Promise<boolean> {
    return this.skinPresetRepo.delete(lobsterId, skinId);
  }
}
