import type { StateCreator } from 'zustand';
import type { LobsterSkin, LobsterPartType, LobsterCustomizationOption } from '@lobster-world/protocol';
import {
  CUSTOMIZATION_DEFAULT_BODY_COLOR,
  CUSTOMIZATION_DEFAULT_CLAW_COLOR,
} from '@lobster-world/protocol';

export interface CustomizationSlice {
  customizerOpen: boolean;
  customizerLobsterId: string | null;
  editingSkin: LobsterSkin;
  savedPresets: LobsterSkin[];

  openCustomizer: (lobsterId: string) => void;
  closeCustomizer: () => void;
  updateEditingSkin: (partial: Partial<LobsterSkin>) => void;
  resetEditingSkin: () => void;
  applySkin: () => void;
  savePreset: (skin: LobsterSkin) => void;
  removePreset: (skinId: string) => void;
  loadPreset: (skin: LobsterSkin) => void;
}

function createDefaultSkin(): LobsterSkin {
  return {
    id: '',
    lobsterId: '',
    bodyColor: CUSTOMIZATION_DEFAULT_BODY_COLOR,
    claw1Color: CUSTOMIZATION_DEFAULT_CLAW_COLOR,
    claw2Color: CUSTOMIZATION_DEFAULT_CLAW_COLOR,
    eyeColor: '#000000',
  };
}

export const AVAILABLE_OPTIONS: Record<LobsterPartType, LobsterCustomizationOption[]> = {
  body: [
    { type: 'body' as LobsterPartType, id: 'capsule_standard', displayName: 'Classic Capsule' },
    { type: 'body' as LobsterPartType, id: 'capsule_rounded', displayName: 'Rounded Capsule' },
  ],
  claws: [
    { type: 'claws' as LobsterPartType, id: 'standard_pincer', displayName: 'Standard Pincer' },
    { type: 'claws' as LobsterPartType, id: 'tech_claw', displayName: 'Tech Claw' },
  ],
  eyes: [
    { type: 'eyes' as LobsterPartType, id: 'round_eyes', displayName: 'Round Eyes' },
    { type: 'eyes' as LobsterPartType, id: 'angular_eyes', displayName: 'Angular Eyes' },
  ],
  tail: [
    { type: 'tail' as LobsterPartType, id: 'fan_tail', displayName: 'Fan Tail' },
    { type: 'tail' as LobsterPartType, id: 'spike_tail', displayName: 'Spike Tail' },
  ],
  accessories: [
    { type: 'accessories' as LobsterPartType, id: 'none', displayName: 'None' },
    { type: 'accessories' as LobsterPartType, id: 'hat', displayName: 'Top Hat' },
    { type: 'accessories' as LobsterPartType, id: 'bowtie', displayName: 'Bow Tie' },
  ],
};

export const createCustomizationSlice: StateCreator<CustomizationSlice, [], [], CustomizationSlice> = (set, get) => ({
  customizerOpen: false,
  customizerLobsterId: null,
  editingSkin: createDefaultSkin(),
  savedPresets: [],

  openCustomizer: (lobsterId: string) => {
    set({
      customizerOpen: true,
      customizerLobsterId: lobsterId,
      editingSkin: { ...createDefaultSkin(), lobsterId },
    });
  },

  closeCustomizer: () => {
    set({ customizerOpen: false, customizerLobsterId: null });
  },

  updateEditingSkin: (partial: Partial<LobsterSkin>) => {
    set((state) => ({
      editingSkin: { ...state.editingSkin, ...partial },
    }));
  },

  resetEditingSkin: () => {
    const lobsterId = get().customizerLobsterId ?? '';
    set({ editingSkin: { ...createDefaultSkin(), lobsterId } });
  },

  applySkin: () => {
    // No-op in store — callers should POST to API and handle response
  },

  savePreset: (skin: LobsterSkin) => {
    set((state) => ({
      savedPresets: [...state.savedPresets, skin],
    }));
  },

  removePreset: (skinId: string) => {
    set((state) => ({
      savedPresets: state.savedPresets.filter((p) => p.id !== skinId),
    }));
  },

  loadPreset: (skin: LobsterSkin) => {
    set({ editingSkin: { ...skin } });
  },
});
