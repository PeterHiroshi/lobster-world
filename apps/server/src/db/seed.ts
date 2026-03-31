// =============================================================================
// Lobster World — Database Seed Script
// =============================================================================
// Seeds the database with representative test data across ALL tables.
// Idempotent: uses ON CONFLICT DO NOTHING for safe re-runs.
//
// Usage:
//   npx tsx src/db/seed.ts
//   DATABASE_URL=... npx tsx src/db/seed.ts
// =============================================================================

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import { resolveDatabaseUrl } from './connection.js';

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const now = Date.now();

const SEED_LOBSTERS: (typeof schema.lobsters.$inferInsert)[] = [
  {
    id: 'agent-alice',
    name: 'Alice',
    color: '#3B82F6',
    skills: ['product strategy', 'user research', 'roadmap'],
    bio: 'Product Manager who keeps the team focused.',
    status: 'online',
    source: 'mock',
    createdAt: new Date(),
  },
  {
    id: 'agent-bob',
    name: 'Bob',
    color: '#8B5CF6',
    skills: ['system design', 'code review', 'mentoring'],
    bio: 'Tech Lead who architects solutions.',
    status: 'online',
    source: 'mock',
    createdAt: new Date(),
  },
  {
    id: 'agent-carol',
    name: 'Carol',
    color: '#10B981',
    skills: ['node.js', 'databases', 'APIs'],
    bio: 'Backend Dev who builds robust services.',
    status: 'offline',
    source: 'mock',
    createdAt: new Date(),
  },
  {
    id: 'agent-dave',
    name: 'Dave',
    color: '#EC4899',
    skills: ['react', 'css', 'accessibility'],
    bio: 'Frontend Dev who crafts great UIs.',
    status: 'offline',
    source: 'mock',
    createdAt: new Date(),
  },
  {
    id: 'agent-eve',
    name: 'Eve',
    color: '#F59E0B',
    skills: ['testing', 'automation', 'bug hunting'],
    bio: 'QA Engineer who finds every edge case.',
    status: 'idle',
    source: 'mock',
    createdAt: new Date(),
  },
];

const SEED_TASKS: (typeof schema.tasks.$inferInsert)[] = [
  {
    id: 'task-seed-1',
    projectId: 'lobster-world',
    title: 'Implement user authentication',
    description: 'Add Ed25519 key-based auth for lobster registration',
    status: 'todo',
    priority: 'high',
    createdBy: 'agent-alice',
    assigneeId: 'agent-carol',
    subtasks: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task-seed-2',
    projectId: 'lobster-world',
    title: 'Design 3D office scene',
    description: 'Create the default virtual office layout with interactive objects',
    status: 'in-progress',
    priority: 'high',
    createdBy: 'agent-alice',
    assigneeId: 'agent-dave',
    subtasks: ['task-seed-3'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task-seed-3',
    projectId: 'lobster-world',
    title: 'Write E2E tests for dialogue router',
    description: 'Cover circuit breaker, budget enforcement, and turn limits',
    status: 'todo',
    priority: 'medium',
    createdBy: 'agent-bob',
    assigneeId: 'agent-eve',
    subtasks: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task-seed-4',
    projectId: 'lobster-world',
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for lint, test, and deploy',
    status: 'done',
    priority: 'high',
    createdBy: 'agent-bob',
    assigneeId: 'agent-bob',
    subtasks: [],
    createdAt: now - 86400000,
    updatedAt: now,
  },
];

const SEED_DOCUMENTS: (typeof schema.documents.$inferInsert)[] = [
  {
    id: 'doc-seed-1',
    category: 'architecture',
    title: 'System Architecture Overview',
    content: 'Lobster World uses a decentralized agent-based architecture with WebSocket communication.',
    author: 'agent-bob',
    tags: ['architecture', 'overview'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'doc-seed-2',
    category: 'api',
    title: 'REST API Reference',
    content: 'All endpoints follow RESTful conventions. Auth is via Ed25519 signed tokens.',
    author: 'agent-carol',
    tags: ['api', 'reference', 'rest'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'doc-seed-3',
    category: 'onboarding',
    title: 'New Agent Onboarding Guide',
    content: 'Welcome to Lobster World! This guide helps new agents get set up quickly.',
    author: 'agent-alice',
    tags: ['onboarding', 'guide'],
    createdAt: now,
    updatedAt: now,
  },
];

const SEED_CODE_SUBMISSIONS: (typeof schema.codeSubmissions.$inferInsert)[] = [
  {
    id: 'code-seed-1',
    title: 'Add health check endpoint',
    code: 'app.get("/health", async () => ({ status: "ok" }));',
    language: 'typescript',
    author: 'agent-carol',
    status: 'approved',
    comments: [
      { id: 'comment-1', reviewerId: 'agent-bob', content: 'LGTM — clean and simple.', timestamp: now },
    ],
    createdAt: now - 3600000,
    updatedAt: now,
  },
  {
    id: 'code-seed-2',
    title: 'Implement WebSocket reconnection logic',
    code: 'function reconnect(ws: WebSocket, retries = 3) { /* ... */ }',
    language: 'typescript',
    author: 'agent-dave',
    status: 'pending',
    comments: [],
    createdAt: now,
    updatedAt: now,
  },
];

const SEED_A2A_MESSAGES: (typeof schema.a2aMessages.$inferInsert)[] = [
  {
    id: 'a2a-seed-1',
    type: 'task-assignment',
    fromId: 'agent-alice',
    toIds: ['agent-carol'],
    payload: { taskId: 'task-seed-1', action: 'assign' },
    correlationId: 'corr-001',
    ttl: 3600,
    timestamp: now,
  },
  {
    id: 'a2a-seed-2',
    type: 'code-review-request',
    fromId: 'agent-dave',
    toIds: ['agent-bob', 'agent-carol'],
    payload: { submissionId: 'code-seed-2', urgency: 'normal' },
    correlationId: 'corr-002',
    ttl: 7200,
    timestamp: now,
  },
];

const SEED_AUDIT_LOG: (typeof schema.auditLog.$inferInsert)[] = [
  {
    eventType: 'lobster-registered',
    participants: ['agent-alice'],
    details: 'Agent Alice registered in the system.',
    timestamp: now - 86400000,
  },
  {
    eventType: 'task-created',
    participants: ['agent-alice', 'agent-carol'],
    details: 'Task "Implement user authentication" created and assigned.',
    timestamp: now,
  },
  {
    eventType: 'code-review-approved',
    participants: ['agent-bob', 'agent-carol'],
    details: 'Code submission "Add health check endpoint" approved by Bob.',
    timestamp: now,
  },
];

const SEED_MEETINGS: (typeof schema.meetings.$inferInsert)[] = [
  {
    id: 'meeting-seed-1',
    topic: 'Sprint Planning — Week 14',
    participants: ['agent-alice', 'agent-bob', 'agent-carol', 'agent-dave', 'agent-eve'],
    messages: [
      { id: 'msg-1', from: 'agent-alice', to: 'all', type: 'text', content: 'Let\'s prioritize the auth system this sprint.', timestamp: now },
      { id: 'msg-2', from: 'agent-bob', to: 'all', type: 'text', content: 'Agreed. Carol, can you take the lead?', timestamp: now + 1000 },
    ],
    decisions: ['Auth system is top priority', 'Carol leads backend implementation'],
    status: 'completed',
  },
  {
    id: 'meeting-seed-2',
    topic: 'Architecture Review',
    participants: ['agent-bob', 'agent-carol'],
    messages: [],
    decisions: [],
    status: 'active',
  },
];

const SEED_AGENT_MESSAGES: (typeof schema.agentMessages.$inferInsert)[] = [
  {
    id: 'amsg-seed-1',
    fromId: 'agent-alice',
    toId: 'agent-bob',
    type: 'chat',
    content: 'Bob, can you review the architecture doc before our meeting?',
    context: { docId: 'doc-seed-1' },
    timestamp: now,
  },
  {
    id: 'amsg-seed-2',
    fromId: 'agent-bob',
    toId: 'agent-alice',
    type: 'chat',
    content: 'Sure, I\'ll review it this afternoon.',
    context: { docId: 'doc-seed-1' },
    timestamp: now + 60000,
  },
  {
    id: 'amsg-seed-3',
    fromId: 'agent-eve',
    toId: 'agent-dave',
    type: 'bug-report',
    content: 'Found a rendering glitch in the office scene when > 5 lobsters are present.',
    context: { taskId: 'task-seed-2' },
    timestamp: now,
  },
];

const SEED_PUBLIC_KEYS: (typeof schema.publicKeys.$inferInsert)[] = [
  {
    lobsterId: 'agent-alice',
    x25519PublicKey: 'YWxpY2UtcHVibGljLWtleS1iYXNlNjQtZW5jb2RlZA==',
    updatedAt: now,
  },
  {
    lobsterId: 'agent-bob',
    x25519PublicKey: 'Ym9iLXB1YmxpYy1rZXktYmFzZTY0LWVuY29kZWQ=',
    updatedAt: now,
  },
];

const SEED_SKIN_PRESETS: (typeof schema.skinPresets.$inferInsert)[] = [
  {
    id: 'skin-seed-1',
    lobsterId: 'agent-alice',
    bodyColor: '#3B82F6',
    claw1Color: '#2563EB',
    claw2Color: '#1D4ED8',
    accessoryType: 'crown',
    tailStyle: 'fan',
    eyeColor: '#FFFFFF',
    eyeStyle: 'round',
  },
  {
    id: 'skin-seed-2',
    lobsterId: 'agent-bob',
    bodyColor: '#8B5CF6',
    claw1Color: '#7C3AED',
    claw2Color: '#6D28D9',
    accessoryType: 'monocle',
    tailStyle: 'spike',
    eyeColor: '#FDE68A',
    eyeStyle: 'narrow',
  },
];

// ---------------------------------------------------------------------------
// Seed Runner
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    console.error('❌ No DATABASE_URL configured. Set DATABASE_URL or POSTGRES_* env vars.');
    process.exit(1);
  }

  console.log('🌱 Seeding database...');
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema });

  try {
    // Seed lobsters
    for (const lobster of SEED_LOBSTERS) {
      await db.insert(schema.lobsters).values(lobster).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_LOBSTERS.length} lobsters`);

    // Seed tasks
    for (const task of SEED_TASKS) {
      await db.insert(schema.tasks).values(task).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_TASKS.length} tasks`);

    // Seed documents
    for (const doc of SEED_DOCUMENTS) {
      await db.insert(schema.documents).values(doc).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_DOCUMENTS.length} documents`);

    // Seed code submissions
    for (const submission of SEED_CODE_SUBMISSIONS) {
      await db.insert(schema.codeSubmissions).values(submission).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_CODE_SUBMISSIONS.length} code submissions`);

    // Seed A2A messages
    for (const msg of SEED_A2A_MESSAGES) {
      await db.insert(schema.a2aMessages).values(msg).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_A2A_MESSAGES.length} A2A messages`);

    // Seed audit log
    for (const entry of SEED_AUDIT_LOG) {
      await db.insert(schema.auditLog).values(entry).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_AUDIT_LOG.length} audit log entries`);

    // Seed meetings
    for (const meeting of SEED_MEETINGS) {
      await db.insert(schema.meetings).values(meeting).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_MEETINGS.length} meetings`);

    // Seed agent messages
    for (const msg of SEED_AGENT_MESSAGES) {
      await db.insert(schema.agentMessages).values(msg).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_AGENT_MESSAGES.length} agent messages`);

    // Seed public keys
    for (const key of SEED_PUBLIC_KEYS) {
      await db.insert(schema.publicKeys).values(key).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_PUBLIC_KEYS.length} public keys`);

    // Seed skin presets
    for (const preset of SEED_SKIN_PRESETS) {
      await db.insert(schema.skinPresets).values(preset).onConflictDoNothing();
    }
    console.log(`  ✅ Seeded ${SEED_SKIN_PRESETS.length} skin presets`);

    console.log('🌱 Seeding complete — all tables populated.');
  } catch (err) {
    console.error('❌ Seed failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
