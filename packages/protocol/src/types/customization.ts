// --- Lobster Customization Types ---

export enum LobsterPartType {
  BODY = 'body',
  CLAWS = 'claws',
  EYES = 'eyes',
  TAIL = 'tail',
  ACCESSORIES = 'accessories',
}

export interface LobsterCustomizationOption {
  type: LobsterPartType;
  id: string;
  displayName: string;
  price?: number;
  unlockedAt?: string;
}

export interface LobsterSkin {
  id: string;
  lobsterId: string;
  bodyColor: string;
  claw1Color?: string;
  claw2Color?: string;
  accessoryType?: string;
  tailStyle?: string;
  eyeColor?: string;
  eyeStyle?: string;
}

export type LobsterBaseModel = 'capsule' | 'realistic' | 'cartoon';
export type LobsterDetailLevel = 'low' | 'medium' | 'high';

export interface CustomizationRenderConfig {
  baseModel: LobsterBaseModel;
  scale: number;
  detail: LobsterDetailLevel;
}
