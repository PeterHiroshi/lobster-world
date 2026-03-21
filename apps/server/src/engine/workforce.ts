import type { AgentRole } from '@lobster-world/protocol';
import { PRESET_ROLES, ROLE_DESK_POSITIONS } from '@lobster-world/protocol';

export interface AgentEntry {
  agentId: string;
  role: AgentRole;
  workload: number;
  deskPosition: { x: number; z: number };
}

export class WorkforceManager {
  private roster: Map<string, AgentEntry> = new Map();

  registerAgent(agentId: string, roleId: string): AgentEntry | undefined {
    const role = PRESET_ROLES.find((r) => r.id === roleId);
    if (!role) return undefined;

    const deskPosition = ROLE_DESK_POSITIONS[roleId] ?? { x: 0, z: 0 };
    const entry: AgentEntry = {
      agentId,
      role,
      workload: 0,
      deskPosition,
    };
    this.roster.set(agentId, entry);
    return entry;
  }

  unregisterAgent(agentId: string): boolean {
    return this.roster.delete(agentId);
  }

  getAgent(agentId: string): AgentEntry | undefined {
    return this.roster.get(agentId);
  }

  getAllAgents(): AgentEntry[] {
    return [...this.roster.values()];
  }

  getAgentsByRole(roleId: string): AgentEntry[] {
    return [...this.roster.values()].filter((e) => e.role.id === roleId);
  }

  incrementWorkload(agentId: string): void {
    const entry = this.roster.get(agentId);
    if (entry) {
      entry.workload++;
    }
  }

  decrementWorkload(agentId: string): void {
    const entry = this.roster.get(agentId);
    if (entry && entry.workload > 0) {
      entry.workload--;
    }
  }

  getWorkload(agentId: string): number {
    return this.roster.get(agentId)?.workload ?? 0;
  }

  findBestAgent(roleId: string): AgentEntry | undefined {
    const candidates = this.getAgentsByRole(roleId);
    if (candidates.length === 0) return undefined;
    return candidates.reduce((best, curr) =>
      curr.workload < best.workload ? curr : best
    );
  }
}
