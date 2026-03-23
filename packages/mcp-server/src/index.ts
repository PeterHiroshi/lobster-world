import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLobsterMcpServer } from './server.js';
import {
  ENV_SERVER_URL,
  ENV_WS_URL,
  ENV_DISPLAY_NAME,
  ENV_COLOR,
  ENV_SKILLS,
  DEFAULT_SERVER_URL,
  DEFAULT_WS_URL,
  DEFAULT_DISPLAY_NAME,
  DEFAULT_COLOR,
  DEFAULT_SKILLS,
} from './constants.js';

function getEnvConfig() {
  return {
    serverUrl: process.env[ENV_SERVER_URL] ?? DEFAULT_SERVER_URL,
    wsUrl: process.env[ENV_WS_URL] ?? DEFAULT_WS_URL,
    displayName: process.env[ENV_DISPLAY_NAME] ?? DEFAULT_DISPLAY_NAME,
    color: process.env[ENV_COLOR] ?? DEFAULT_COLOR,
    skills: process.env[ENV_SKILLS]?.split(',').map((s) => s.trim()) ?? [...DEFAULT_SKILLS],
  };
}

async function main(): Promise<void> {
  const config = getEnvConfig();
  const { mcpServer } = createLobsterMcpServer(config);
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${(err as Error).message}\n`);
  process.exit(1);
});

// Re-exports for library usage
export { createLobsterMcpServer } from './server.js';
export { PlatformClient } from './client.js';
export type { PlatformClientConfig } from './client.js';
export type { LobsterMcpServerConfig } from './server.js';
