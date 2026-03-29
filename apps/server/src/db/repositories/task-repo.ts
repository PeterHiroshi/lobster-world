import type { Task, TaskStatus, TaskPriority } from '@lobster-world/protocol';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../connection.js';
import { tasks as tasksTable } from '../schema.js';

export interface CreateTaskOpts {
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  createdBy: string;
  assigneeId?: string;
}

export interface TaskRepository {
  create(opts: CreateTaskOpts): Promise<Task>;
  getById(id: string): Promise<Task | undefined>;
  getAll(): Promise<Task[]>;
  getByProject(projectId: string): Promise<Task[]>;
  getByAssignee(assigneeId: string): Promise<Task[]>;
  getByStatus(status: TaskStatus): Promise<Task[]>;
  update(id: string, partial: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'status' | 'assigneeId' | 'subtasks'>>): Promise<Task | undefined>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}

export class InMemoryTaskRepo implements TaskRepository {
  private tasks: Map<string, Task> = new Map();
  private nextId = 1;

  async create(opts: CreateTaskOpts): Promise<Task> {
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

  async getById(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getAll(): Promise<Task[]> {
    return [...this.tasks.values()];
  }

  async getByProject(projectId: string): Promise<Task[]> {
    return [...this.tasks.values()].filter((t) => t.projectId === projectId);
  }

  async getByAssignee(assigneeId: string): Promise<Task[]> {
    return [...this.tasks.values()].filter((t) => t.assigneeId === assigneeId);
  }

  async getByStatus(status: TaskStatus): Promise<Task[]> {
    return [...this.tasks.values()].filter((t) => t.status === status);
  }

  async update(id: string, partial: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'status' | 'assigneeId' | 'subtasks'>>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    if (partial.title !== undefined) task.title = partial.title;
    if (partial.description !== undefined) task.description = partial.description;
    if (partial.priority !== undefined) task.priority = partial.priority;
    if (partial.status !== undefined) task.status = partial.status;
    if (partial.assigneeId !== undefined) task.assigneeId = partial.assigneeId;
    if (partial.subtasks !== undefined) task.subtasks = partial.subtasks;
    task.updatedAt = Date.now();
    return task;
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async count(): Promise<number> {
    return this.tasks.size;
  }
}

function rowToTask(row: typeof tasksTable.$inferSelect): Task {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    createdBy: row.createdBy,
    assigneeId: row.assigneeId ?? undefined,
    subtasks: (row.subtasks as string[]) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PgTaskRepo implements TaskRepository {
  private nextId = 1;

  constructor(private db: Database) {}

  async create(opts: CreateTaskOpts): Promise<Task> {
    const id = `task-${this.nextId++}`;
    const now = Date.now();
    const [row] = await this.db.insert(tasksTable).values({
      id,
      projectId: opts.projectId,
      title: opts.title,
      description: opts.description,
      status: 'todo',
      priority: opts.priority,
      createdBy: opts.createdBy,
      assigneeId: opts.assigneeId ?? null,
      subtasks: [],
      createdAt: now,
      updatedAt: now,
    }).returning();
    return rowToTask(row);
  }

  async getById(id: string): Promise<Task | undefined> {
    const [row] = await this.db.select().from(tasksTable).where(eq(tasksTable.id, id));
    return row ? rowToTask(row) : undefined;
  }

  async getAll(): Promise<Task[]> {
    const rows = await this.db.select().from(tasksTable);
    return rows.map(rowToTask);
  }

  async getByProject(projectId: string): Promise<Task[]> {
    const rows = await this.db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
    return rows.map(rowToTask);
  }

  async getByAssignee(assigneeId: string): Promise<Task[]> {
    const rows = await this.db.select().from(tasksTable).where(eq(tasksTable.assigneeId, assigneeId));
    return rows.map(rowToTask);
  }

  async getByStatus(status: TaskStatus): Promise<Task[]> {
    const rows = await this.db.select().from(tasksTable).where(eq(tasksTable.status, status));
    return rows.map(rowToTask);
  }

  async update(id: string, partial: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'status' | 'assigneeId' | 'subtasks'>>): Promise<Task | undefined> {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (partial.title !== undefined) updates.title = partial.title;
    if (partial.description !== undefined) updates.description = partial.description;
    if (partial.priority !== undefined) updates.priority = partial.priority;
    if (partial.status !== undefined) updates.status = partial.status;
    if (partial.assigneeId !== undefined) updates.assigneeId = partial.assigneeId;
    if (partial.subtasks !== undefined) updates.subtasks = partial.subtasks;

    const [row] = await this.db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
    return row ? rowToTask(row) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(tasksTable).where(eq(tasksTable.id, id)).returning();
    return result.length > 0;
  }

  async count(): Promise<number> {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(tasksTable);
    return Number(result.count);
  }
}
