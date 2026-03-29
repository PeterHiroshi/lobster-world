import { pgTable, text, integer, timestamp, jsonb, uuid, index } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Lobster Registry
// ---------------------------------------------------------------------------

export const lobsters = pgTable('lobsters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  skills: jsonb('skills').$type<string[]>().default([]),
  bio: text('bio'),
  avatar: text('avatar'),
  status: text('status').default('offline'),
  source: text('source'),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_lobsters_status').on(t.status),
]);

// ---------------------------------------------------------------------------
// Task Management
// ---------------------------------------------------------------------------

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('medium'),
  assigneeId: text('assignee_id'),
  createdBy: text('created_by').notNull(),
  subtasks: jsonb('subtasks').$type<string[]>().default([]),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  index('idx_tasks_project_id').on(t.projectId),
  index('idx_tasks_status').on(t.status),
  index('idx_tasks_assignee_id').on(t.assigneeId),
]);

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  author: text('author').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  index('idx_documents_category').on(t.category),
]);

// ---------------------------------------------------------------------------
// Code Review Submissions
// ---------------------------------------------------------------------------

export const codeSubmissions = pgTable('code_submissions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  code: text('code').notNull(),
  language: text('language').notNull(),
  author: text('author').notNull(),
  status: text('status').notNull().default('pending'),
  comments: jsonb('comments').$type<Array<{ id: string; reviewerId: string; content: string; timestamp: number }>>().default([]),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  index('idx_code_submissions_status').on(t.status),
]);

// ---------------------------------------------------------------------------
// A2A Protocol Messages
// ---------------------------------------------------------------------------

export const a2aMessages = pgTable('a2a_messages', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  fromId: text('from_id').notNull(),
  toIds: jsonb('to_ids').$type<string[]>().notNull(),
  payload: jsonb('payload').notNull(),
  correlationId: text('correlation_id'),
  ttl: integer('ttl'),
  timestamp: integer('timestamp').notNull(),
}, (t) => [
  index('idx_a2a_messages_from_id').on(t.fromId),
  index('idx_a2a_messages_correlation_id').on(t.correlationId),
]);

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: text('event_type').notNull(),
  participants: jsonb('participants').$type<string[]>().notNull(),
  details: text('details').notNull(),
  timestamp: integer('timestamp').notNull(),
}, (t) => [
  index('idx_audit_log_event_type').on(t.eventType),
  index('idx_audit_log_timestamp').on(t.timestamp),
]);

// ---------------------------------------------------------------------------
// Meeting Rooms
// ---------------------------------------------------------------------------

export const meetings = pgTable('meetings', {
  id: text('id').primaryKey(),
  topic: text('topic').notNull(),
  participants: jsonb('participants').$type<string[]>().default([]),
  messages: jsonb('messages').$type<Array<{ id: string; from: string; to: string; type: string; content: string; timestamp: number }>>().default([]),
  decisions: jsonb('decisions').$type<string[]>().default([]),
  status: text('status').notNull().default('active'),
});

// ---------------------------------------------------------------------------
// Agent-to-Agent Messages
// ---------------------------------------------------------------------------

export const agentMessages = pgTable('agent_messages', {
  id: text('id').primaryKey(),
  fromId: text('from_id').notNull(),
  toId: text('to_id').notNull(),
  type: text('type').notNull(),
  content: text('content').notNull(),
  context: jsonb('context').$type<{ taskId?: string; docId?: string }>(),
  timestamp: integer('timestamp').notNull(),
}, (t) => [
  index('idx_agent_messages_from_to').on(t.fromId, t.toId),
  index('idx_agent_messages_timestamp').on(t.timestamp),
]);

// ---------------------------------------------------------------------------
// E2E Encryption Public Keys
// ---------------------------------------------------------------------------

export const publicKeys = pgTable('public_keys', {
  lobsterId: text('lobster_id').primaryKey(),
  x25519PublicKey: text('x25519_public_key').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// ---------------------------------------------------------------------------
// Lobster Skin Customization Presets
// ---------------------------------------------------------------------------

export const skinPresets = pgTable('skin_presets', {
  id: text('id').primaryKey(),
  lobsterId: text('lobster_id').notNull(),
  bodyColor: text('body_color').notNull(),
  claw1Color: text('claw1_color'),
  claw2Color: text('claw2_color'),
  accessoryType: text('accessory_type'),
  tailStyle: text('tail_style'),
  eyeColor: text('eye_color'),
  eyeStyle: text('eye_style'),
}, (t) => [
  index('idx_skin_presets_lobster_id').on(t.lobsterId),
]);
