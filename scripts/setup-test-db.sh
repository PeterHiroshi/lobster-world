#!/bin/bash
# =============================================================================
# Lobster World — PostgreSQL Test Database Setup
# =============================================================================
# Creates/resets the test database for running PG integration tests.
#
# Usage:
#   ./scripts/setup-test-db.sh
#
# Prerequisites:
#   - PostgreSQL running (via docker-compose.dev.yml or local install)
#   - POSTGRES_USER/POSTGRES_PASSWORD set or defaults used
# =============================================================================

set -euo pipefail

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-lobster}"
DB_PASSWORD="${POSTGRES_PASSWORD:-lobster_dev}"
DB_NAME="lobster_world_test"

export PGPASSWORD="$DB_PASSWORD"

echo "🧪 Setting up test database: ${DB_NAME}"

# Create test database if it doesn't exist
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
    -c "CREATE DATABASE ${DB_NAME}"

echo "✅ Test database ready: postgres://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""
echo "Run tests with:"
echo "  TEST_DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME} pnpm -F @lobster-world/server test"
