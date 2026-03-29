-- =============================================================================
-- Lobster World — Database Bootstrap
-- =============================================================================
-- This script runs once when the PostgreSQL container is first created
-- (via docker-entrypoint-initdb.d). It ensures the database exists and is
-- ready for Drizzle migrations.
--
-- Schema creation and indexes are managed by Drizzle migrations:
--   pnpm -F @lobster-world/server db:migrate
--
-- For fresh setups, run migrations after the container is healthy:
--   docker compose up -d db
--   pnpm -F @lobster-world/server db:migrate
--   pnpm -F @lobster-world/server db:seed    # optional
-- =============================================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- =============================================================================
-- Fallback: Create tables directly for environments where Drizzle CLI
-- is not available (e.g., production Docker with no dev tooling).
-- These use IF NOT EXISTS so they're safe alongside Drizzle migrations.
-- =============================================================================

-- Lobster registry
CREATE TABLE IF NOT EXISTS lobsters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  skills JSONB DEFAULT '[]',
  bio TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'offline',
  source TEXT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task management
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_id TEXT,
  created_by TEXT NOT NULL,
  subtasks JSONB DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Code review submissions
CREATE TABLE IF NOT EXISTS code_submissions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  author TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  comments JSONB DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- A2A protocol messages
CREATE TABLE IF NOT EXISTS a2a_messages (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_ids JSONB NOT NULL,
  payload JSONB NOT NULL,
  correlation_id TEXT,
  ttl INTEGER,
  timestamp INTEGER NOT NULL
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  participants JSONB NOT NULL,
  details TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

-- Meeting rooms
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  participants JSONB DEFAULT '[]',
  messages JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active'
);

-- Agent-to-agent messages
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  context JSONB,
  timestamp INTEGER NOT NULL
);

-- E2E encryption public keys
CREATE TABLE IF NOT EXISTS public_keys (
  lobster_id TEXT PRIMARY KEY,
  x25519_public_key TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Lobster skin customization presets
CREATE TABLE IF NOT EXISTS skin_presets (
  id TEXT PRIMARY KEY,
  lobster_id TEXT NOT NULL,
  body_color TEXT NOT NULL,
  claw1_color TEXT,
  claw2_color TEXT,
  accessory_type TEXT,
  tail_style TEXT,
  eye_color TEXT,
  eye_style TEXT
);

-- Drizzle migration tracking table (so Drizzle sees these as already applied)
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at BIGINT
);

-- =============================================================================
-- Indexes for common query patterns
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_lobsters_status ON lobsters (status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents (category);
CREATE INDEX IF NOT EXISTS idx_code_submissions_status ON code_submissions (status);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_from_id ON a2a_messages (from_id);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_correlation_id ON a2a_messages (correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_messages_from_to ON agent_messages (from_id, to_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_timestamp ON agent_messages (timestamp);
CREATE INDEX IF NOT EXISTS idx_skin_presets_lobster_id ON skin_presets (lobster_id);
