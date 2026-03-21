import type { Task, TaskStatus, TaskPriority } from '@lobster-world/protocol';
import { VALID_TASK_TRANSITIONS, MAX_TASKS_PER_PROJECT } from '@lobster-world/protocol';

export interface CreateTaskOpts {
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  createdBy: string;
  assigneeId?: string;
}

export class TaskEngine {
  private tasks: Map<string, Task> = new Map();
  private nextId: number = 1;

  createTask(opts: CreateTaskOpts): Task {
    const id = `task-${this.nextId++}`;
    const now = Date.now();
    const task: Task = {
      id,
      projectId: opts.projectId,
      title: opts.title,
      description: opts.description,
      status: 'todo',
      priority: opts.priority,
      createdBy: opts.createdBy,
      assigneeId: opts.assigneeId,
      subtasks: [],
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return [...this.tasks.values()];
  }

  getTasksByProject(projectId: string): Task[] {
    return this.getAllTasks().filter((t) => t.projectId === projectId);
  }

  getTasksByAssignee(assigneeId: string): Task[] {
    return this.getAllTasks().filter((t) => t.assigneeId === assigneeId);
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getAllTasks().filter((t) => t.status === status);
  }

  updateTask(
    id: string,
    partial: Partial<Pick<Task, 'title' | 'description' | 'priority'>>,
  ): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    if (partial.title !== undefined) task.title = partial.title;
    if (partial.description !== undefined) task.description = partial.description;
    if (partial.priority !== undefined) task.priority = partial.priority;
    task.updatedAt = Date.now();
    return task;
  }

  transitionStatus(id: string, newStatus: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const allowed = VALID_TASK_TRANSITIONS[task.status];
    if (!allowed.includes(newStatus)) return undefined;
    task.status = newStatus;
    task.updatedAt = Date.now();
    return task;
  }

  assignTask(taskId: string, agentId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    task.assigneeId = agentId;
    if (task.status === 'todo') {
      task.status = 'doing';
    }
    task.updatedAt = Date.now();
    return task;
  }

  createSubtask(parentId: string, opts: CreateTaskOpts): Task | undefined {
    const parent = this.tasks.get(parentId);
    if (!parent) return undefined;
    const subtask = this.createTask(opts);
    parent.subtasks.push(subtask.id);
    parent.updatedAt = Date.now();
    return subtask;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  getTaskCount(): number {
    return this.tasks.size;
  }
}
