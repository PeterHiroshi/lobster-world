import type { StateCreator } from 'zustand';
import type { Task, Meeting, PlatformEvent } from '@lobster-world/protocol';

export interface TeamAgent {
  id: string;
  roleId: string;
  name: string;
  color: string;
}

export interface TaskCardAnimation {
  taskId: string;
  fromStatus: string;
  toStatus: string;
  startTime: number;
}

export interface TaskSlice {
  tasks: Record<string, Task>;
  meetings: Record<string, Meeting>;
  teamAgents: TeamAgent[];
  platformEvents: PlatformEvent[];
  taskAnimations: TaskCardAnimation[];

  removeTaskAnimation: (taskId: string) => void;
}

export const createTaskSlice: StateCreator<TaskSlice, [], [], TaskSlice> = (set) => ({
  tasks: {},
  meetings: {},
  teamAgents: [],
  platformEvents: [],
  taskAnimations: [],

  removeTaskAnimation: (taskId: string) => {
    set((state) => ({
      taskAnimations: state.taskAnimations.filter((a) => a.taskId !== taskId),
    }));
  },
});
