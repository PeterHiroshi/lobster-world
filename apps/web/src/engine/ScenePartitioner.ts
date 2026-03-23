import type { LobsterState, Vec3 } from '@lobster-world/protocol';
import { SPATIAL_GRID_CELL_SIZE } from '@lobster-world/protocol';

/**
 * Spatial partitioning grid for O(1) nearby-lobster lookups.
 * Divides the scene into a uniform grid where each cell tracks
 * which lobsters are currently inside it.
 */
export class ScenePartitioner {
  private grid = new Map<string, Set<string>>();
  private lobsterCells = new Map<string, string>();
  private readonly cellSize: number;

  constructor(cellSize = SPATIAL_GRID_CELL_SIZE) {
    this.cellSize = cellSize;
  }

  private getGridKey(position: Vec3): string {
    const cx = Math.floor(position.x / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    return `${cx},${cz}`;
  }

  private getAdjacentKeys(key: string): string[] {
    const [cx, cz] = key.split(',').map(Number);
    const keys: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        keys.push(`${cx + dx},${cz + dz}`);
      }
    }
    return keys;
  }

  updateLobster(lobster: LobsterState): void {
    const newKey = this.getGridKey(lobster.position);
    const oldKey = this.lobsterCells.get(lobster.id);

    if (oldKey === newKey) return;

    // Remove from old cell
    if (oldKey !== undefined) {
      const oldCell = this.grid.get(oldKey);
      if (oldCell) {
        oldCell.delete(lobster.id);
        if (oldCell.size === 0) this.grid.delete(oldKey);
      }
    }

    // Add to new cell
    let newCell = this.grid.get(newKey);
    if (!newCell) {
      newCell = new Set();
      this.grid.set(newKey, newCell);
    }
    newCell.add(lobster.id);
    this.lobsterCells.set(lobster.id, newKey);
  }

  removeLobster(lobsterId: string): void {
    const key = this.lobsterCells.get(lobsterId);
    if (key !== undefined) {
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(lobsterId);
        if (cell.size === 0) this.grid.delete(key);
      }
      this.lobsterCells.delete(lobsterId);
    }
  }

  /**
   * Returns IDs of lobsters in the same cell and adjacent cells.
   * Excludes the queried lobster's own ID.
   */
  getNearbyLobsterIds(lobsterId: string): string[] {
    const key = this.lobsterCells.get(lobsterId);
    if (key === undefined) return [];

    const adjacentKeys = this.getAdjacentKeys(key);
    const result: string[] = [];
    for (const k of adjacentKeys) {
      const cell = this.grid.get(k);
      if (cell) {
        for (const id of cell) {
          if (id !== lobsterId) result.push(id);
        }
      }
    }
    return result;
  }

  /**
   * Returns IDs of lobsters within a given radius of a position.
   * Uses grid cells for broad phase, then distance check for narrow phase.
   */
  getLobsterIdsInRadius(
    position: Vec3,
    radius: number,
    lobsters: Record<string, LobsterState>,
  ): string[] {
    const radiusSq = radius * radius;
    const cellRadius = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(position.x / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);

    const result: string[] = [];
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const cell = this.grid.get(`${cx + dx},${cz + dz}`);
        if (!cell) continue;
        for (const id of cell) {
          const l = lobsters[id];
          if (!l) continue;
          const ddx = l.position.x - position.x;
          const ddz = l.position.z - position.z;
          if (ddx * ddx + ddz * ddz <= radiusSq) {
            result.push(id);
          }
        }
      }
    }
    return result;
  }

  /**
   * Rebuild the entire grid from a lobster record.
   */
  rebuild(lobsters: Record<string, LobsterState>): void {
    this.grid.clear();
    this.lobsterCells.clear();
    for (const lobster of Object.values(lobsters)) {
      this.updateLobster(lobster);
    }
  }

  getCellCount(): number {
    return this.grid.size;
  }

  getLobsterCount(): number {
    return this.lobsterCells.size;
  }
}
