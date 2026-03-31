import type { LobsterSkin } from '@lobster-world/protocol';
import { eq, and, sql } from 'drizzle-orm';
import type { Database } from '../connection.js';
import { skinPresets } from '../schema.js';

export interface SkinPresetRepository {
  save(lobsterId: string, skin: LobsterSkin): Promise<boolean>;
  getByLobster(lobsterId: string): Promise<LobsterSkin[]>;
  delete(lobsterId: string, skinId: string): Promise<boolean>;
  count(lobsterId: string): Promise<number>;
}

export class InMemorySkinPresetRepo implements SkinPresetRepository {
  private presets: Map<string, LobsterSkin[]> = new Map();

  async save(lobsterId: string, skin: LobsterSkin): Promise<boolean> {
    const list = this.presets.get(lobsterId) ?? [];
    list.push({ ...skin, lobsterId });
    this.presets.set(lobsterId, list);
    return true;
  }

  async getByLobster(lobsterId: string): Promise<LobsterSkin[]> {
    return this.presets.get(lobsterId) ?? [];
  }

  async delete(lobsterId: string, skinId: string): Promise<boolean> {
    const list = this.presets.get(lobsterId);
    if (!list) return false;
    const idx = list.findIndex((s) => s.id === skinId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }

  async count(lobsterId: string): Promise<number> {
    return (this.presets.get(lobsterId) ?? []).length;
  }
}

function rowToSkin(row: typeof skinPresets.$inferSelect): LobsterSkin {
  return {
    id: row.id,
    lobsterId: row.lobsterId,
    bodyColor: row.bodyColor,
    claw1Color: row.claw1Color ?? undefined,
    claw2Color: row.claw2Color ?? undefined,
    accessoryType: row.accessoryType ?? undefined,
    tailStyle: row.tailStyle ?? undefined,
    eyeColor: row.eyeColor ?? undefined,
    eyeStyle: row.eyeStyle ?? undefined,
  };
}

export class PgSkinPresetRepo implements SkinPresetRepository {
  constructor(private db: Database) {}

  async save(lobsterId: string, skin: LobsterSkin): Promise<boolean> {
    await this.db.insert(skinPresets).values({
      id: skin.id,
      lobsterId,
      bodyColor: skin.bodyColor,
      claw1Color: skin.claw1Color ?? null,
      claw2Color: skin.claw2Color ?? null,
      accessoryType: skin.accessoryType ?? null,
      tailStyle: skin.tailStyle ?? null,
      eyeColor: skin.eyeColor ?? null,
      eyeStyle: skin.eyeStyle ?? null,
    });
    return true;
  }

  async getByLobster(lobsterId: string): Promise<LobsterSkin[]> {
    const rows = await this.db.select().from(skinPresets).where(eq(skinPresets.lobsterId, lobsterId));
    return rows.map(rowToSkin);
  }

  async delete(lobsterId: string, skinId: string): Promise<boolean> {
    const result = await this.db
      .delete(skinPresets)
      .where(and(eq(skinPresets.lobsterId, lobsterId), eq(skinPresets.id, skinId)))
      .returning();
    return result.length > 0;
  }

  async count(lobsterId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(skinPresets)
      .where(eq(skinPresets.lobsterId, lobsterId));
    return Number(result.count);
  }
}
