import { describe, it, expect, beforeEach } from 'vitest';
import { TaskEngine, type CreateTaskOpts } from '../src/engine/tasks.js';

function makeOpts(overrides?: Partial<CreateTaskOpts>): CreateTaskOpts {
  return {
    projectId: 'proj-1',
    title: 'Test Task',
    description: 'A test task',
    priority: 'medium',
    createdBy: 'agent-1',
    ...overrides,
  };
}

describe('TaskEngine', () => {
  let engine: TaskEngine;

  beforeEach(() => {
    engine = new TaskEngine();
  });

  // --- Create ---

  it('creates a task with correct defaults', () => {
    const task = engine.createTask(makeOpts());
    expect(task.id).toBe('task-1');
    expect(task.projectId).toBe('proj-1');
    expect(task.title).toBe('Test Task');
    expect(task.description).toBe('A test task');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.createdBy).toBe('agent-1');
    expect(task.assigneeId).toBeUndefined();
    expect(task.subtasks).toEqual([]);
    expect(task.createdAt).toBeTypeOf('number');
    expect(task.updatedAt).toBe(task.createdAt);
  });

  it('creates a task with an assignee', () => {
    const task = engine.createTask(makeOpts({ assigneeId: 'agent-2' }));
    expect(task.assigneeId).toBe('agent-2');
  });

  it('increments task IDs', () => {
    const t1 = engine.createTask(makeOpts());
    const t2 = engine.createTask(makeOpts());
    expect(t1.id).toBe('task-1');
    expect(t2.id).toBe('task-2');
  });

  // --- Get ---

  it('gets a task by ID', () => {
    const created = engine.createTask(makeOpts());
    const found = engine.getTask(created.id);
    expect(found).toBe(created);
  });

  it('returns undefined for non-existent task ID', () => {
    expect(engine.getTask('task-999')).toBeUndefined();
  });

  it('gets all tasks', () => {
    engine.createTask(makeOpts({ title: 'A' }));
    engine.createTask(makeOpts({ title: 'B' }));
    expect(engine.getAllTasks()).toHaveLength(2);
  });

  it('gets tasks by project', () => {
    engine.createTask(makeOpts({ projectId: 'proj-1' }));
    engine.createTask(makeOpts({ projectId: 'proj-2' }));
    engine.createTask(makeOpts({ projectId: 'proj-1' }));
    expect(engine.getTasksByProject('proj-1')).toHaveLength(2);
    expect(engine.getTasksByProject('proj-2')).toHaveLength(1);
  });

  it('gets tasks by assignee', () => {
    engine.createTask(makeOpts({ assigneeId: 'agent-A' }));
    engine.createTask(makeOpts({ assigneeId: 'agent-B' }));
    engine.createTask(makeOpts({ assigneeId: 'agent-A' }));
    expect(engine.getTasksByAssignee('agent-A')).toHaveLength(2);
    expect(engine.getTasksByAssignee('agent-B')).toHaveLength(1);
  });

  it('gets tasks by status', () => {
    engine.createTask(makeOpts());
    engine.createTask(makeOpts());
    expect(engine.getTasksByStatus('todo')).toHaveLength(2);
    expect(engine.getTasksByStatus('doing')).toHaveLength(0);
  });

  // --- Update ---

  it('updates task title', () => {
    const task = engine.createTask(makeOpts());
    const updated = engine.updateTask(task.id, { title: 'New Title' });
    expect(updated?.title).toBe('New Title');
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(task.createdAt);
  });

  it('updates task priority', () => {
    const task = engine.createTask(makeOpts({ priority: 'low' }));
    const updated = engine.updateTask(task.id, { priority: 'urgent' });
    expect(updated?.priority).toBe('urgent');
  });

  it('returns undefined when updating non-existent task', () => {
    expect(engine.updateTask('task-999', { title: 'X' })).toBeUndefined();
  });

  // --- Status transitions ---

  it('transitions todo → doing (valid)', () => {
    const task = engine.createTask(makeOpts());
    const result = engine.transitionStatus(task.id, 'doing');
    expect(result?.status).toBe('doing');
  });

  it('transitions doing → review (valid)', () => {
    const task = engine.createTask(makeOpts());
    engine.transitionStatus(task.id, 'doing');
    const result = engine.transitionStatus(task.id, 'review');
    expect(result?.status).toBe('review');
  });

  it('transitions review → done (valid)', () => {
    const task = engine.createTask(makeOpts());
    engine.transitionStatus(task.id, 'doing');
    engine.transitionStatus(task.id, 'review');
    const result = engine.transitionStatus(task.id, 'done');
    expect(result?.status).toBe('done');
  });

  it('rejects todo → review (invalid)', () => {
    const task = engine.createTask(makeOpts());
    expect(engine.transitionStatus(task.id, 'review')).toBeUndefined();
    expect(engine.getTask(task.id)?.status).toBe('todo');
  });

  it('rejects done → todo (invalid)', () => {
    const task = engine.createTask(makeOpts());
    engine.transitionStatus(task.id, 'doing');
    engine.transitionStatus(task.id, 'review');
    engine.transitionStatus(task.id, 'done');
    expect(engine.transitionStatus(task.id, 'todo')).toBeUndefined();
    expect(engine.getTask(task.id)?.status).toBe('done');
  });

  it('transitions todo → done (valid skip)', () => {
    const task = engine.createTask(makeOpts());
    const result = engine.transitionStatus(task.id, 'done');
    expect(result?.status).toBe('done');
  });

  it('returns undefined when transitioning non-existent task', () => {
    expect(engine.transitionStatus('task-999', 'doing')).toBeUndefined();
  });

  // --- Assign ---

  it('assigns task and auto-transitions from todo to doing', () => {
    const task = engine.createTask(makeOpts());
    const result = engine.assignTask(task.id, 'agent-X');
    expect(result?.assigneeId).toBe('agent-X');
    expect(result?.status).toBe('doing');
  });

  it('assigns task but stays doing if already doing', () => {
    const task = engine.createTask(makeOpts());
    engine.transitionStatus(task.id, 'doing');
    const result = engine.assignTask(task.id, 'agent-Y');
    expect(result?.assigneeId).toBe('agent-Y');
    expect(result?.status).toBe('doing');
  });

  it('returns undefined when assigning non-existent task', () => {
    expect(engine.assignTask('task-999', 'agent-Z')).toBeUndefined();
  });

  // --- Subtasks ---

  it('creates subtask and updates parent subtasks array', () => {
    const parent = engine.createTask(makeOpts({ title: 'Parent' }));
    const subtask = engine.createSubtask(parent.id, makeOpts({ title: 'Child' }));
    expect(subtask).toBeDefined();
    expect(subtask?.title).toBe('Child');
    const updatedParent = engine.getTask(parent.id);
    expect(updatedParent?.subtasks).toContain(subtask?.id);
  });

  it('returns undefined when creating subtask with non-existent parent', () => {
    expect(engine.createSubtask('task-999', makeOpts())).toBeUndefined();
  });

  // --- Delete ---

  it('deletes an existing task and returns true', () => {
    const task = engine.createTask(makeOpts());
    expect(engine.deleteTask(task.id)).toBe(true);
    expect(engine.getTask(task.id)).toBeUndefined();
  });

  it('returns false when deleting non-existent task', () => {
    expect(engine.deleteTask('task-999')).toBe(false);
  });

  // --- Count ---

  it('returns correct task count', () => {
    expect(engine.getTaskCount()).toBe(0);
    engine.createTask(makeOpts());
    engine.createTask(makeOpts());
    expect(engine.getTaskCount()).toBe(2);
    engine.deleteTask('task-1');
    expect(engine.getTaskCount()).toBe(1);
  });
});
