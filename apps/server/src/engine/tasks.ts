import type { Task, TaskStatus } from '@lobster-world/protocol';
import { VALID_TASK_TRANSITIONS } from '@lobster-world/protocol';
import type { TaskRepository, CreateTaskOpts } from '../db/repositories/task-repo.js';
import { InMemoryTaskRepo } from '../db/repositories/task-repo.js';

export type { CreateTaskOpts } from '../db/repositories/task-repo.js';

export class TaskEngine {
  private repo: TaskRepository;

  constructor(repo?: TaskRepository) {
    this.repo = repo ?? new InMemoryTaskRepo();
  }

  async createTask(opts: CreateTaskOpts): Promise<Task> {
    return this.repo.create(opts);
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.repo.getById(id);
  }

  async getAllTasks(): Promise<Task[]> {
    return this.repo.getAll();
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return this.repo.getByProject(projectId);
  }

  async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    return this.repo.getByAssignee(assigneeId);
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    return this.repo.getByStatus(status);
  }

  async updateTask(
    id: string,
    partial: Partial<Pick<Task, 'title' | 'description' | 'priority'>>,
  ): Promise<Task | undefined> {
    return this.repo.update(id, partial);
  }

  async transitionStatus(id: string, newStatus: TaskStatus): Promise<Task | undefined> {
    const task = await this.repo.getById(id);
    if (!task) return undefined;
    const allowed = VALID_TASK_TRANSITIONS[task.status];
    if (!allowed.includes(newStatus)) return undefined;
    return this.repo.update(id, { status: newStatus });
  }

  async assignTask(taskId: string, agentId: string): Promise<Task | undefined> {
    const task = await this.repo.getById(taskId);
    if (!task) return undefined;
    const updates: Partial<Pick<Task, 'assigneeId' | 'status'>> = { assigneeId: agentId };
    if (task.status === 'todo') {
      updates.status = 'doing';
    }
    return this.repo.update(taskId, updates);
  }

  async createSubtask(parentId: string, opts: CreateTaskOpts): Promise<Task | undefined> {
    const parent = await this.repo.getById(parentId);
    if (!parent) return undefined;
    const subtask = await this.repo.create(opts);
    await this.repo.update(parentId, { subtasks: [...parent.subtasks, subtask.id] });
    return subtask;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async getTaskCount(): Promise<number> {
    return this.repo.count();
  }
}
