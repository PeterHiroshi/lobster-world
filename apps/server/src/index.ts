import { createApp } from './app.js';
import { startTeamScenario } from './mock/mock-team.js';
import { SERVER_PORT } from './config.js';

const app = await createApp();

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
