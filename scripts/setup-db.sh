#!/usr/bin/env bash
# =============================================================================
# Lobster World — Full Database Setup
# =============================================================================
# Starts PostgreSQL via Docker Compose (dev mode), waits for it to be healthy,
# runs Drizzle migrations, and optionally seeds the database.
#
# Usage:
#   ./scripts/setup-db.sh          # migrate only
#   ./scripts/setup-db.sh --seed   # migrate + seed
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$PROJECT_DIR/apps/server"

# Defaults
SEED=false
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
  esac
done

echo "🐳 Starting PostgreSQL (docker-compose.dev.yml)..."
docker compose -f "$PROJECT_DIR/docker-compose.dev.yml" up -d

echo "⏳ Waiting for PostgreSQL to be healthy..."
RETRIES=30
until docker compose -f "$PROJECT_DIR/docker-compose.dev.yml" exec -T db pg_isready -U lobster -d lobster_world > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "❌ PostgreSQL failed to start within timeout."
    exit 1
  fi
  sleep 1
done
echo "✅ PostgreSQL is ready."

echo "🔄 Running Drizzle migrations..."
cd "$SERVER_DIR"
DATABASE_URL="${DATABASE_URL:-postgres://lobster:lobster_dev@localhost:5432/lobster_world}" \
  npx tsx src/db/migrate.ts

if [ "$SEED" = true ]; then
  echo "🌱 Seeding database..."
  DATABASE_URL="${DATABASE_URL:-postgres://lobster:lobster_dev@localhost:5432/lobster_world}" \
    npx tsx src/db/seed.ts
fi

echo ""
echo "🎉 Database setup complete!"
echo "   Connection: postgres://lobster:lobster_dev@localhost:5432/lobster_world"
echo "   Run server: pnpm -F @lobster-world/server dev"
