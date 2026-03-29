import 'dotenv/config';
import { createApp, createPgDeps } from './app.js';
import { startTeamScenario } from './mock/mock-team.js';
import { SERVER_PORT } from './config.js';
import { resolveDatabaseUrl } from './db/index.js';

const databaseUrl = resolveDatabaseUrl();

let app;
if (databaseUrl) {
  const { deps, dbConnection } = await createPgDeps(databaseUrl);
  app = await createApp(deps, dbConnection);
  app.server.log.info('PostgreSQL persistence enabled');
} else {
  app = await createApp();
  app.server.log.info('Running with in-memory storage (no DATABASE_URL set)');
}

// Start team scenario (5 agents with project lifecycle)
const serverUrl = `ws://localhost:${SERVER_PORT}`;
startTeamScenario(
  serverUrl,
  app.deps.workforce,
  app.deps.tasks,
  app.deps.comms,
  app.deps.events,
  app.deps.connections,
);

process.on('SIGTERM', app.shutdown);
process.on('SIGINT', app.shutdown);

await app.start();

app.server.log.info('Team scenario started with 5 agents');

// Re-export for backward compatibility
export const {
  server,
  deps: {
    connections,
    registry,
    scene,
    dialogue,
    circuitBreaker,
    auditLog,
    authManager,
    lobbyManager,
    consentManager,
    budgetEnforcer,
    workforce,
    tasks,
    comms,
    events,
  },
  shutdown,
} = app;
