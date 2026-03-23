import { describe, it, expect } from 'vitest';
import { createLobsterMcpServer } from '../src/server.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../src/constants.js';

describe('LobsterMcpServer', () => {
  const config = {
    serverUrl: 'http://localhost:3001',
    wsUrl: 'ws://localhost:3001/ws/social',
    displayName: 'Test Agent',
    color: '#FF6B35',
    skills: ['coding'],
  };

  it('creates MCP server and platform client', () => {
    const { mcpServer, client } = createLobsterMcpServer(config);
    expect(mcpServer).toBeDefined();
    expect(client).toBeDefined();
  });

  it('platform client has correct config', () => {
    const { client } = createLobsterMcpServer(config);
    expect(client.getConfig().displayName).toBe('Test Agent');
    expect(client.getConfig().serverUrl).toBe('http://localhost:3001');
  });

  it('exports expected MCP server name and version', () => {
    expect(MCP_SERVER_NAME).toBe('lobster-world');
    expect(MCP_SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
