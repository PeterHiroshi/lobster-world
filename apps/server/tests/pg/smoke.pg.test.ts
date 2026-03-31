/**
 * PostgreSQL Smoke Tests — CRUD Verification
 * ============================================
 * Verifies Create, Read, Update, Delete operations across ALL major tables.
 * Uses PGlite (embedded) by default so no external PostgreSQL is needed.
 * Set TEST_DATABASE_URL to run against a real PostgreSQL instance.
 *
 * Run:
 *   pnpm -F @lobster-world/server test:smoke
 *   TEST_DATABASE_URL=postgres://... pnpm -F @lobster-world/server test:smoke
 */
import { pgTestSuite } from '../helpers/pg-test-helpers.js';
import { PgLobsterRepo } from '../../src/db/repositories/lobster-repo.js';
import { PgTaskRepo } from '../../src/db/repositories/task-repo.js';
import { PgDocRepo } from '../../src/db/repositories/doc-repo.js';
import { PgCodeReviewRepo } from '../../src/db/repositories/code-review-repo.js';
import { PgA2ARepo } from '../../src/db/repositories/a2a-repo.js';
import { PgAuditRepo } from '../../src/db/repositories/audit-repo.js';
import { PgCommsRepo } from '../../src/db/repositories/comms-repo.js';
import { PgKeyStoreRepo } from '../../src/db/repositories/key-store-repo.js';
import { PgSkinPresetRepo } from '../../src/db/repositories/skin-preset-repo.js';

// ==========================================================================
// Lobster CRUD
// ==========================================================================

pgTestSuite('Smoke: Lobster CRUD', ({ getDb }) => {
  it('CREATE — registers a new lobster via upsert', async () => {
    const repo = new PgLobsterRepo(getDb());
    const record = await repo.upsert({
      id: 'smoke-lobster-1',
      name: 'Smokey',
      color: '#FF0000',
      skills: ['testing'],
      bio: 'Smoke test lobster',
    });
    expect(record.id).toBe('smoke-lobster-1');
    expect(record.name).toBe('Smokey');
    expect(record.status).toBe('online');
  });

  it('READ — retrieves lobster by ID', async () => {
    const repo = new PgLobsterRepo(getDb());
    await repo.upsert({ id: 'smoke-lobster-1', name: 'Smokey', color: '#FF0000', skills: [] });
    const found = await repo.getById('smoke-lobster-1');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Smokey');
  });

  it('UPDATE — updates lobster status', async () => {
    const repo = new PgLobsterRepo(getDb());
    await repo.upsert({ id: 'smoke-lobster-1', name: 'Smokey', color: '#FF0000', skills: [] });
    await repo.updateStatus('smoke-lobster-1', 'idle');
    const updated = await repo.getById('smoke-lobster-1');
    expect(updated?.status).toBe('idle');
  });

  it('DELETE — removes lobster', async () => {
    const repo = new PgLobsterRepo(getDb());
    await repo.upsert({ id: 'smoke-lobster-1', name: 'Smokey', color: '#FF0000', skills: [] });
    const deleted = await repo.delete('smoke-lobster-1');
    expect(deleted).toBe(true);
    expect(await repo.getById('smoke-lobster-1')).toBeUndefined();
  });

  it('LIST — returns all lobsters', async () => {
    const repo = new PgLobsterRepo(getDb());
    await repo.upsert({ id: 'l-1', name: 'A', color: '#000', skills: [] });
    await repo.upsert({ id: 'l-2', name: 'B', color: '#111', skills: [] });
    const all = await repo.getAll();
    expect(all).toHaveLength(2);
  });

  it('COUNT — returns correct count', async () => {
    const repo = new PgLobsterRepo(getDb());
    expect(await repo.count()).toBe(0);
    await repo.upsert({ id: 'l-1', name: 'A', color: '#000', skills: [] });
    expect(await repo.count()).toBe(1);
  });
});

// ==========================================================================
// Task CRUD
// ==========================================================================

pgTestSuite('Smoke: Task CRUD', ({ getDb }) => {
  it('CREATE — creates a task', async () => {
    const repo = new PgTaskRepo(getDb());
    const task = await repo.create({
      projectId: 'proj-smoke',
      title: 'Smoke Task',
      description: 'Verify task creation',
      priority: 'high',
      createdBy: 'agent-smoke',
    });
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Smoke Task');
    expect(task.status).toBe('todo');
  });

  it('READ — retrieves task by ID', async () => {
    const repo = new PgTaskRepo(getDb());
    const created = await repo.create({
      projectId: 'proj-smoke',
      title: 'Read Test',
      description: '',
      priority: 'medium',
      createdBy: 'agent-smoke',
    });
    const found = await repo.getById(created.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Read Test');
  });

  it('UPDATE — updates task fields', async () => {
    const repo = new PgTaskRepo(getDb());
    const task = await repo.create({
      projectId: 'proj-smoke',
      title: 'Update Test',
      description: '',
      priority: 'low',
      createdBy: 'agent-smoke',
    });
    const updated = await repo.update(task.id, { title: 'Updated Title', priority: 'urgent' });
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.priority).toBe('urgent');
  });

  it('DELETE — removes task', async () => {
    const repo = new PgTaskRepo(getDb());
    const task = await repo.create({
      projectId: 'proj-smoke',
      title: 'Delete Test',
      description: '',
      priority: 'low',
      createdBy: 'agent-smoke',
    });
    expect(await repo.delete(task.id)).toBe(true);
    expect(await repo.getById(task.id)).toBeUndefined();
  });

  it('FILTER — by project and status', async () => {
    const repo = new PgTaskRepo(getDb());
    await repo.create({ projectId: 'p1', title: 'A', description: '', priority: 'medium', createdBy: 'x' });
    await repo.create({ projectId: 'p2', title: 'B', description: '', priority: 'medium', createdBy: 'x' });
    expect(await repo.getByProject('p1')).toHaveLength(1);
    expect(await repo.getByStatus('todo')).toHaveLength(2);
  });
});

// ==========================================================================
// Document CRUD
// ==========================================================================

pgTestSuite('Smoke: Document CRUD', ({ getDb }) => {
  it('CREATE — creates a document', async () => {
    const repo = new PgDocRepo(getDb());
    const doc = await repo.create({
      category: 'architecture' as never,
      title: 'Smoke Doc',
      content: 'Smoke test content',
      author: 'agent-smoke',
      tags: ['smoke', 'test'],
    });
    expect(doc.id).toBeDefined();
    expect(doc.title).toBe('Smoke Doc');
  });

  it('READ — retrieves document by ID', async () => {
    const repo = new PgDocRepo(getDb());
    const created = await repo.create({
      category: 'api' as never,
      title: 'Read Doc',
      content: 'Content',
      author: 'agent-smoke',
      tags: [],
    });
    const found = await repo.getById(created.id);
    expect(found?.title).toBe('Read Doc');
  });

  it('UPDATE — updates document content', async () => {
    const repo = new PgDocRepo(getDb());
    const doc = await repo.create({
      category: 'api' as never,
      title: 'Update Doc',
      content: 'Old',
      author: 'agent-smoke',
      tags: [],
    });
    const updated = await repo.update(doc.id, { content: 'New Content' });
    expect(updated?.content).toBe('New Content');
  });

  it('DELETE — removes document', async () => {
    const repo = new PgDocRepo(getDb());
    const doc = await repo.create({
      category: 'api' as never,
      title: 'Delete Doc',
      content: 'Bye',
      author: 'agent-smoke',
      tags: [],
    });
    expect(await repo.delete(doc.id)).toBe(true);
    expect(await repo.getById(doc.id)).toBeUndefined();
  });
});

// ==========================================================================
// Code Review CRUD
// ==========================================================================

pgTestSuite('Smoke: Code Review CRUD', ({ getDb }) => {
  it('CREATE — submits code for review', async () => {
    const repo = new PgCodeReviewRepo(getDb());
    const sub = await repo.create({
      title: 'Smoke Submission',
      code: 'console.log("hello")',
      language: 'typescript',
      author: 'agent-smoke',
    });
    expect(sub.id).toBeDefined();
    expect(sub.status).toBe('pending');
  });

  it('READ — retrieves submission by ID', async () => {
    const repo = new PgCodeReviewRepo(getDb());
    const sub = await repo.create({
      title: 'Read Sub',
      code: 'x = 1',
      language: 'python',
      author: 'agent-smoke',
    });
    const found = await repo.getById(sub.id);
    expect(found?.title).toBe('Read Sub');
  });

  it('UPDATE — updates submission status', async () => {
    const repo = new PgCodeReviewRepo(getDb());
    const sub = await repo.create({
      title: 'Status Test',
      code: 'fn main() {}',
      language: 'rust',
      author: 'agent-smoke',
    });
    const updated = await repo.update(sub.id, {
      status: 'approved',
      comments: [{ id: 'c-1', reviewerId: 'agent-reviewer', content: 'LGTM', timestamp: Date.now() }],
    });
    expect(updated?.status).toBe('approved');
    expect(updated?.comments).toHaveLength(1);
  });

  it('READ — filters by status and author', async () => {
    const repo = new PgCodeReviewRepo(getDb());
    await repo.create({ title: 'A', code: '', language: 'ts', author: 'agent-a' });
    await repo.create({ title: 'B', code: '', language: 'ts', author: 'agent-b' });
    expect(await repo.getByStatus('pending')).toHaveLength(2);
    expect(await repo.getByAuthor('agent-a')).toHaveLength(1);
  });
});

// ==========================================================================
// A2A Messages CRUD
// ==========================================================================

pgTestSuite('Smoke: A2A Messages CRUD', ({ getDb }) => {
  it('CREATE — stores an A2A message', async () => {
    const repo = new PgA2ARepo(getDb());
    await repo.save({
      id: 'a2a-smoke-1',
      type: 'task-assignment' as never,
      from: 'agent-a',
      to: ['agent-b'],
      payload: { action: 'assign' } as never,
      timestamp: Date.now(),
    });
    const found = await repo.getById('a2a-smoke-1');
    expect(found).toBeDefined();
    expect(found?.id).toBe('a2a-smoke-1');
  });

  it('READ — retrieves by correlation ID', async () => {
    const repo = new PgA2ARepo(getDb());
    await repo.save({
      id: 'a2a-smoke-2',
      type: 'task-assignment' as never,
      from: 'agent-a',
      to: ['agent-b'],
      payload: {} as never,
      correlationId: 'corr-test',
      timestamp: Date.now(),
    });
    const msgs = await repo.getByCorrelation('corr-test');
    expect(msgs).toHaveLength(1);
  });

  it('COUNT — returns correct count', async () => {
    const repo = new PgA2ARepo(getDb());
    expect(await repo.count()).toBe(0);
    await repo.save({
      id: 'a2a-smoke-3',
      type: 'task-assignment' as never,
      from: 'agent-a',
      to: 'agent-b',
      payload: {} as never,
      timestamp: Date.now(),
    });
    expect(await repo.count()).toBe(1);
  });
});

// ==========================================================================
// Audit Log CRUD
// ==========================================================================

pgTestSuite('Smoke: Audit Log CRUD', ({ getDb }) => {
  it('CREATE — logs an event', async () => {
    const repo = new PgAuditRepo(getDb());
    await repo.log('lobster_join', ['agent-smoke'], 'Smoke test audit entry');
    const all = await repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].eventType).toBe('lobster_join');
  });

  it('READ — retrieves recent entries', async () => {
    const repo = new PgAuditRepo(getDb());
    await repo.log('lobster_join', ['agent-a'], 'Join');
    await repo.log('lobster_leave', ['agent-a'], 'Leave');
    await repo.log('dialogue_start', ['agent-a', 'agent-b'], 'Chat');
    const recent = await repo.getRecent(2);
    expect(recent).toHaveLength(2);
  });

  it('DELETE — clears all entries', async () => {
    const repo = new PgAuditRepo(getDb());
    await repo.log('lobster_join', ['agent-a'], 'Join');
    await repo.clear();
    expect(await repo.size()).toBe(0);
  });
});

// ==========================================================================
// Comms (Agent Messages + Meetings) CRUD
// ==========================================================================

pgTestSuite('Smoke: Comms CRUD', ({ getDb }) => {
  it('CREATE — saves a message', async () => {
    const repo = new PgCommsRepo(getDb());
    await repo.saveMessage({
      id: 'msg-smoke-1',
      from: 'agent-a',
      to: 'agent-b',
      type: 'chat',
      content: 'Hello from smoke test',
      timestamp: Date.now(),
    });
    const msgs = await repo.getAllMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('Hello from smoke test');
  });

  it('READ — retrieves messages for an agent', async () => {
    const repo = new PgCommsRepo(getDb());
    const ts = Date.now();
    await repo.saveMessage({ id: 'm1', from: 'a', to: 'b', type: 'chat', content: 'Hi', timestamp: ts });
    await repo.saveMessage({ id: 'm2', from: 'b', to: 'a', type: 'chat', content: 'Hey', timestamp: ts + 1 });
    await repo.saveMessage({ id: 'm3', from: 'c', to: 'd', type: 'chat', content: 'Other', timestamp: ts + 2 });
    const msgs = await repo.getMessages('a');
    expect(msgs).toHaveLength(2);
  });

  it('CREATE/READ — meeting lifecycle', async () => {
    const repo = new PgCommsRepo(getDb());
    await repo.saveMeeting({
      id: 'meet-smoke-1',
      topic: 'Smoke Test Meeting',
      participants: ['agent-a', 'agent-b'],
      messages: [],
      decisions: [],
      status: 'active',
    });
    const meeting = await repo.getMeeting('meet-smoke-1');
    expect(meeting).toBeDefined();
    expect(meeting?.topic).toBe('Smoke Test Meeting');
    expect(meeting?.status).toBe('active');
  });

  it('UPDATE — updates meeting with decisions', async () => {
    const repo = new PgCommsRepo(getDb());
    await repo.saveMeeting({
      id: 'meet-smoke-2',
      topic: 'Update Test',
      participants: ['agent-a'],
      messages: [],
      decisions: [],
      status: 'active',
    });
    await repo.updateMeeting('meet-smoke-2', {
      id: 'meet-smoke-2',
      topic: 'Update Test',
      participants: ['agent-a'],
      messages: [],
      decisions: ['Decision 1'],
      status: 'completed',
    });
    const updated = await repo.getMeeting('meet-smoke-2');
    expect(updated?.status).toBe('completed');
    expect(updated?.decisions).toContain('Decision 1');
  });
});

// ==========================================================================
// Key Store CRUD
// ==========================================================================

pgTestSuite('Smoke: Key Store CRUD', ({ getDb }) => {
  it('CREATE — stores a public key', async () => {
    const repo = new PgKeyStoreRepo(getDb());
    const record = await repo.store('agent-smoke', 'base64-public-key-data');
    expect(record.lobsterId).toBe('agent-smoke');
    expect(record.x25519PublicKey).toBe('base64-public-key-data');
  });

  it('READ — retrieves key by lobster ID', async () => {
    const repo = new PgKeyStoreRepo(getDb());
    await repo.store('agent-smoke', 'key-data');
    const found = await repo.get('agent-smoke');
    expect(found).toBeDefined();
  });

  it('UPDATE — overwrites existing key', async () => {
    const repo = new PgKeyStoreRepo(getDb());
    await repo.store('agent-smoke', 'key-v1');
    const updated = await repo.store('agent-smoke', 'key-v2');
    expect(updated).toBeDefined();
    expect(await repo.size()).toBe(1);
  });

  it('DELETE — removes key', async () => {
    const repo = new PgKeyStoreRepo(getDb());
    await repo.store('agent-smoke', 'key-data');
    const removed = await repo.remove('agent-smoke');
    expect(removed).toBe(true);
    expect(await repo.get('agent-smoke')).toBeUndefined();
  });
});

// ==========================================================================
// Skin Presets CRUD
// ==========================================================================

pgTestSuite('Smoke: Skin Presets CRUD', ({ getDb }) => {
  it('CREATE — saves a skin preset', async () => {
    const repo = new PgSkinPresetRepo(getDb());
    const saved = await repo.save('agent-smoke', {
      id: 'skin-smoke-1',
      lobsterId: 'agent-smoke',
      bodyColor: '#FF0000',
      claw1Color: '#00FF00',
      claw2Color: '#0000FF',
    });
    expect(saved).toBe(true);
  });

  it('READ — retrieves presets by lobster ID', async () => {
    const repo = new PgSkinPresetRepo(getDb());
    await repo.save('agent-a', { id: 'sk-1', lobsterId: 'agent-a', bodyColor: '#111' });
    await repo.save('agent-a', { id: 'sk-2', lobsterId: 'agent-a', bodyColor: '#222' });
    await repo.save('agent-b', { id: 'sk-3', lobsterId: 'agent-b', bodyColor: '#333' });
    const presets = await repo.getByLobster('agent-a');
    expect(presets).toHaveLength(2);
  });

  it('DELETE — removes preset', async () => {
    const repo = new PgSkinPresetRepo(getDb());
    await repo.save('agent-smoke', { id: 'sk-del', lobsterId: 'agent-smoke', bodyColor: '#FFF' });
    const deleted = await repo.delete('agent-smoke', 'sk-del');
    expect(deleted).toBe(true);
    expect(await repo.count('agent-smoke')).toBe(0);
  });

  it('COUNT — returns correct count per lobster', async () => {
    const repo = new PgSkinPresetRepo(getDb());
    expect(await repo.count('agent-x')).toBe(0);
    await repo.save('agent-x', { id: 'sk-c1', lobsterId: 'agent-x', bodyColor: '#AAA' });
    await repo.save('agent-x', { id: 'sk-c2', lobsterId: 'agent-x', bodyColor: '#BBB' });
    expect(await repo.count('agent-x')).toBe(2);
  });
});
