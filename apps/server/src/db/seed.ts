// =============================================================================
// Lobster World — Database Seed Script
// =============================================================================
// Seeds the database with the default team of 5 agents and a sample project.
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

const SEED_LOBSTERS: (typeof schema.lobsters.$inferInsert)[] = [
  {
    id: 'agent-alice',
    name: 'Alice',
    color: '#3B82F6',
    skills: ['product strategy', 'user research', 'roadmap'],
    bio: 'Product Manager who keeps the team focused.',
    status: 'offline',
    source: 'mock',
    createdAt: new Date(),
  },
  {
    id: 'agent-bob',
    name: 'Bob',
    color: '#8B5CF6',
    skills: ['system design', 'code review', 'mentoring'],
    bio: 'Tech Lead who architects solutions.',
    status: 'offline',
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
    status: 'offline',
    source: 'mock',
    createdAt: new Date(),
  },
];

const now = Date.now();

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
    subtasks: [],
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
];

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

    console.log('🌱 Seeding complete.');
  } catch (err) {
    console.error('❌ Seed failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
