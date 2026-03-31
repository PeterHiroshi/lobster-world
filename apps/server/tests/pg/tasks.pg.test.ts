/**
 * TaskEngine — PostgreSQL Integration Tests
 *
 * Mirrors the InMemory tests in tasks.test.ts but runs against a real PG database.
 * Skipped when TEST_DATABASE_URL is not set.
 */
import { pgTestSuite } from '../helpers/pg-test-helpers.js';
import { TaskEngine, type CreateTaskOpts } from '../../src/engine/tasks.js';
import { PgTaskRepo } from '../../src/db/repositories/task-repo.js';

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

pgTestSuite('TaskEngine (PostgreSQL)', ({ getDb }) => {
  let engine: TaskEngine;

  beforeEach(() => {
    engine = new TaskEngine(new PgTaskRepo(getDb()));
  });

  // --- Create ---

  it('creates a task with correct defaults', async () => {
    const task = await engine.createTask(makeOpts());
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

  it('creates a task with an assignee', async () => {
    const task = await engine.createTask(makeOpts({ assigneeId: 'agent-2' }));
    expect(task.assigneeId).toBe('agent-2');
  });

  it('increments task IDs', async () => {
    const t1 = await engine.createTask(makeOpts());
    const t2 = await engine.createTask(makeOpts());
    expect(t1.id).toBe('task-1');
    expect(t2.id).toBe('task-2');
  });

  // --- Get ---

  it('gets a task by ID', async () => {
    const created = await engine.createTask(makeOpts());
    const found = await engine.getTask(created.id);
    expect(found).toEqual(created);
  });

  it('returns undefined for non-existent task ID', async () => {
    expect(await engine.getTask('task-999')).toBeUndefined();
  });

  it('gets all tasks', async () => {
    await engine.createTask(makeOpts({ title: 'A' }));
    await engine.createTask(makeOpts({ title: 'B' }));
    expect(await engine.getAllTasks()).toHaveLength(2);
  });

  it('gets tasks by project', async () => {
    await engine.createTask(makeOpts({ projectId: 'proj-1' }));
    await engine.createTask(makeOpts({ projectId: 'proj-2' }));
    await engine.createTask(makeOpts({ projectId: 'proj-1' }));
    expect(await engine.getTasksByProject('proj-1')).toHaveLength(2);
    expect(await engine.getTasksByProject('proj-2')).toHaveLength(1);
  });

  it('gets tasks by assignee', async () => {
    await engine.createTask(makeOpts({ assigneeId: 'agent-A' }));
    await engine.createTask(makeOpts({ assigneeId: 'agent-B' }));
    await engine.createTask(makeOpts({ assigneeId: 'agent-A' }));
    expect(await engine.getTasksByAssignee('agent-A')).toHaveLength(2);
    expect(await engine.getTasksByAssignee('agent-B')).toHaveLength(1);
  });

  it('gets tasks by status', async () => {
    await engine.createTask(makeOpts());
    await engine.createTask(makeOpts());
    expect(await engine.getTasksByStatus('todo')).toHaveLength(2);
    expect(await engine.getTasksByStatus('doing')).toHaveLength(0);
  });

  // --- Update ---

  it('updates task title', async () => {
    const task = await engine.createTask(makeOpts());
    const updated = await engine.updateTask(task.id, { title: 'New Title' });
    expect(updated?.title).toBe('New Title');
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(task.createdAt);
  });

  it('updates task priority', async () => {
    const task = await engine.createTask(makeOpts({ priority: 'low' }));
    const updated = await engine.updateTask(task.id, { priority: 'urgent' });
    expect(updated?.priority).toBe('urgent');
  });

  it('returns undefined when updating non-existent task', async () => {
    expect(await engine.updateTask('task-999', { title: 'X' })).toBeUndefined();
  });

  // --- Status transitions ---

  it('transitions todo -> doing (valid)', async () => {
    const task = await engine.createTask(makeOpts());
    const result = await engine.transitionStatus(task.id, 'doing');
    expect(result?.status).toBe('doing');
  });

  it('transitions doing -> review (valid)', async () => {
    const task = await engine.createTask(makeOpts());
    await engine.transitionStatus(task.id, 'doing');
    const result = await engine.transitionStatus(task.id, 'review');
    expect(result?.status).toBe('review');
  });

  it('transitions review -> done (valid)', async () => {
    const task = await engine.createTask(makeOpts());
    await engine.transitionStatus(task.id, 'doing');
    await engine.transitionStatus(task.id, 'review');
    const result = await engine.transitionStatus(task.id, 'done');
    expect(result?.status).toBe('done');
  });

  it('rejects todo -> review (invalid)', async () => {
    const task = await engine.createTask(makeOpts());
    expect(await engine.transitionStatus(task.id, 'review')).toBeUndefined();
    expect((await engine.getTask(task.id))?.status).toBe('todo');
  });

  it('rejects done -> todo (invalid)', async () => {
    const task = await engine.createTask(makeOpts());
    await engine.transitionStatus(task.id, 'doing');
    await engine.transitionStatus(task.id, 'review');
    await engine.transitionStatus(task.id, 'done');
    expect(await engine.transitionStatus(task.id, 'todo')).toBeUndefined();
    expect((await engine.getTask(task.id))?.status).toBe('done');
  });

  it('transitions todo -> done (valid skip)', async () => {
    const task = await engine.createTask(makeOpts());
    const result = await engine.transitionStatus(task.id, 'done');
    expect(result?.status).toBe('done');
  });

  it('returns undefined when transitioning non-existent task', async () => {
    expect(await engine.transitionStatus('task-999', 'doing')).toBeUndefined();
  });

  // --- Assign ---

  it('assigns task and auto-transitions from todo to doing', async () => {
    const task = await engine.createTask(makeOpts());
    const result = await engine.assignTask(task.id, 'agent-X');
    expect(result?.assigneeId).toBe('agent-X');
    expect(result?.status).toBe('doing');
  });

  it('assigns task but stays doing if already doing', async () => {
    const task = await engine.createTask(makeOpts());
    await engine.transitionStatus(task.id, 'doing');
    const result = await engine.assignTask(task.id, 'agent-Y');
    expect(result?.assigneeId).toBe('agent-Y');
    expect(result?.status).toBe('doing');
  });

  it('returns undefined when assigning non-existent task', async () => {
    expect(await engine.assignTask('task-999', 'agent-Z')).toBeUndefined();
  });

  // --- Subtasks ---

  it('creates subtask and updates parent subtasks array', async () => {
    const parent = await engine.createTask(makeOpts({ title: 'Parent' }));
    const subtask = await engine.createSubtask(parent.id, makeOpts({ title: 'Child' }));
    expect(subtask).toBeDefined();
    expect(subtask?.title).toBe('Child');
    const updatedParent = await engine.getTask(parent.id);
    expect(updatedParent?.subtasks).toContain(subtask?.id);
  });

  it('returns undefined when creating subtask with non-existent parent', async () => {
    expect(await engine.createSubtask('task-999', makeOpts())).toBeUndefined();
  });

  // --- Delete ---

  it('deletes an existing task and returns true', async () => {
    const task = await engine.createTask(makeOpts());
    expect(await engine.deleteTask(task.id)).toBe(true);
    expect(await engine.getTask(task.id)).toBeUndefined();
  });

  it('returns false when deleting non-existent task', async () => {
    expect(await engine.deleteTask('task-999')).toBe(false);
  });

  // --- Count ---

  it('returns correct task count', async () => {
    expect(await engine.getTaskCount()).toBe(0);
    await engine.createTask(makeOpts());
    await engine.createTask(makeOpts());
    expect(await engine.getTaskCount()).toBe(2);
    await engine.deleteTask('task-1');
    expect(await engine.getTaskCount()).toBe(1);
  });
});
