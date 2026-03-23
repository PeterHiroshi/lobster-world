import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PlatformClient, type PlatformClientConfig } from './client.js';
import { createWorldTools } from './tools/world.js';
import { createTaskTools } from './tools/tasks.js';
import { createChatTools } from './tools/chat.js';
import { createDocsTools } from './tools/docs.js';
import { createCodeTools } from './tools/code.js';
import { createA2ATools } from './tools/a2a.js';
import { createResources } from './resources/scene.js';
import { createA2AResources } from './resources/a2a.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './constants.js';
import type { ToolDefinition } from './tools/world.js';
import type { ResourceDefinition } from './resources/scene.js';

export interface LobsterMcpServerConfig extends PlatformClientConfig {}

export function createLobsterMcpServer(config: LobsterMcpServerConfig): {
  mcpServer: McpServer;
  client: PlatformClient;
} {
  const client = new PlatformClient(config);

  const mcpServer = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  // Collect all tools
  const allTools: ToolDefinition[] = [
    ...createWorldTools(client),
    ...createTaskTools(client),
    ...createChatTools(client),
    ...createDocsTools(client),
    ...createCodeTools(client),
    ...createA2ATools(client),
  ];

  // Register each tool with the MCP server
  for (const tool of allTools) {
    mcpServer.tool(
      tool.name,
      tool.description,
      tool.inputSchema.properties as Record<string, unknown>,
      async (args: Record<string, unknown>) => {
        const result = await tool.handler(args);
        return {
          content: [{ type: 'text' as const, text: result.content }],
          isError: result.isError,
        };
      },
    );
  }

  // Collect all resources
  const allResources: ResourceDefinition[] = [
    ...createResources(client),
    ...createA2AResources(client),
  ];

  // Register each resource with the MCP server
  for (const resource of allResources) {
    mcpServer.resource(
      resource.name,
      resource.uri,
      { description: resource.description, mimeType: resource.mimeType },
      async () => {
        const result = await resource.handler();
        return {
          contents: result.contents.map((c) => ({
            uri: c.uri,
            mimeType: c.mimeType,
            text: c.text,
          })),
        };
      },
    );
  }

  return { mcpServer, client };
}
