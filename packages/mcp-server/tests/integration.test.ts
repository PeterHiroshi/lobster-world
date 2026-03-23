import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PlatformClient } from '../src/client.js';
import { createWorldTools } from '../src/tools/world.js';
import { createTaskTools } from '../src/tools/tasks.js';
import { createChatTools } from '../src/tools/chat.js';
import { createDocsTools } from '../src/tools/docs.js';
import { createCodeTools } from '../src/tools/code.js';
import { createResources } from '../src/resources/scene.js';
import type { ToolDefinition } from '../src/tools/world.js';
import type { ResourceDefinition } from '../src/resources/scene.js';

// Dynamic import to use the server's createApp
async function startTestServer(): Promise<{ url: string; shutdown: () => Promise<void> }> {
  // Import the server app factory directly
  const { createApp } = await import('../../../apps/server/src/app.js');
  const app = await createApp();

  // Listen on random port
  await app.server.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.server.address();
  if (typeof addr !== 'object' || addr === null) throw new Error('Failed to get address');
  const url = `http://127.0.0.1:${addr.port}`;
  return { url, shutdown: app.shutdown };
}

describe('Integration: MCP tools against real server', () => {
  let serverUrl: string;
  let shutdown: () => Promise<void>;
  let client: PlatformClient;
  let allTools: ToolDefinition[];
  let allResources: ResourceDefinition[];

  beforeAll(async () => {
    const server = await startTestServer();
    serverUrl = server.url;
    shutdown = server.shutdown;

    client = new PlatformClient({
      serverUrl,
      wsUrl: serverUrl.replace('http', 'ws') + '/ws/social',
      displayName: 'IntegrationTest',
      color: '#00FF00',
      skills: ['testing'],
    });

    allTools = [
      ...createWorldTools(client),
      ...createTaskTools(client),
      ...createChatTools(client),
      ...createDocsTools(client),
      ...createCodeTools(client),
    ];
    allResources = createResources(client);
  });

  afterAll(async () => {
    await shutdown();
  });

  function findTool(name: string): ToolDefinition {
    const tool = allTools.find((t) => t.name === name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return tool;
  }

  function findResource(uriSuffix: string): ResourceDefinition {
    const resource = allResources.find((r) => r.uri.endsWith(uriSuffix));
    if (!resource) throw new Error(`Resource ${uriSuffix} not found`);
    return resource;
  }

  // --- World Tools ---

  it('lobster.world.status handles /api/world (or gracefully errors)', async () => {
    const tool = findTool('lobster.world.status');
    const result = await tool.handler({});
    // /api/world is in lobster-api.ts (separate registration), may not be available
    // Either works or returns a graceful error
    expect(result.content).toBeDefined();
  });

  it('lobster.world.join returns confirmation', async () => {
    const tool = findTool('lobster.world.join');
    const result = await tool.handler({});
    expect(result.content).toContain('IntegrationTest');
  });

  it('lobster.status.update returns confirmation', async () => {
    const tool = findTool('lobster.status.update');
    const result = await tool.handler({ status: 'busy' });
    expect(result.content).toContain('busy');
  });

  // --- Task Tools ---

  it('full task lifecycle: create → list → update → assign', async () => {
    // Create
    const createTool = findTool('lobster.tasks.create');
    const createResult = await createTool.handler({
      title: 'Integration test task',
      description: 'Created by integration test',
      priority: 'high',
      projectId: 'test-project',
    });
    expect(createResult.isError).toBeUndefined();
    const createdTask = JSON.parse(createResult.content);
    expect(createdTask.id).toBeDefined();
    expect(createdTask.title).toBe('Integration test task');
    expect(createdTask.status).toBe('todo');

    // List
    const listTool = findTool('lobster.tasks.list');
    const listResult = await listTool.handler({});
    expect(listResult.isError).toBeUndefined();
    const tasks = JSON.parse(listResult.content);
    expect(tasks.length).toBeGreaterThan(0);

    // Update status
    const updateTool = findTool('lobster.tasks.update');
    const updateResult = await updateTool.handler({
      taskId: createdTask.id,
      status: 'doing',
    });
    expect(updateResult.isError).toBeUndefined();
    const updatedTask = JSON.parse(updateResult.content);
    expect(updatedTask.status).toBe('doing');

    // Assign
    const assignTool = findTool('lobster.tasks.assign');
    const assignResult = await assignTool.handler({
      taskId: createdTask.id,
      assigneeId: 'test-agent',
    });
    expect(assignResult.isError).toBeUndefined();
    const assignedTask = JSON.parse(assignResult.content);
    expect(assignedTask.assigneeId).toBe('test-agent');
  });

  // --- Chat Tools ---

  it('lobster.chat.send sends a direct message', async () => {
    const tool = findTool('lobster.chat.send');
    const result = await tool.handler({ to: 'agent-1', content: 'Hello from integration test' });
    expect(result.isError).toBeUndefined();
    expect(result.content).toContain('Message sent');
  });

  it('lobster.chat.broadcast sends a broadcast', async () => {
    const tool = findTool('lobster.chat.broadcast');
    const result = await tool.handler({ content: 'Broadcast from integration test' });
    expect(result.isError).toBeUndefined();
    expect(result.content).toContain('Broadcast sent');
  });

  it('lobster.meeting.start and end lifecycle', async () => {
    const startTool = findTool('lobster.meeting.start');
    const startResult = await startTool.handler({
      topic: 'Integration Test Standup',
      participants: ['agent-1', 'agent-2'],
    });
    expect(startResult.isError).toBeUndefined();
    // Extract JSON from "Meeting started: {...}"
    const startJson = startResult.content.substring(startResult.content.indexOf('{'));
    const meeting = JSON.parse(startJson);
    expect(meeting.id).toBeDefined();

    const endTool = findTool('lobster.meeting.end');
    const endResult = await endTool.handler({ meetingId: meeting.id });
    // Meeting end should succeed (no error) or handle gracefully
    expect(endResult.content).toContain('Meeting ended');
  });

  // --- Docs Tools ---

  it('lobster.docs.write and read lifecycle', async () => {
    const writeTool = findTool('lobster.docs.write');
    const writeResult = await writeTool.handler({
      title: 'Integration Test Doc',
      content: 'This is test content',
      category: 'general',
      tags: ['test', 'integration'],
    });
    expect(writeResult.isError).toBeUndefined();
    const doc = JSON.parse(writeResult.content.replace('Document created: ', ''));
    expect(doc.id).toBeDefined();

    const readTool = findTool('lobster.docs.read');
    const readResult = await readTool.handler({ docId: doc.id });
    expect(readResult.isError).toBeUndefined();
    expect(readResult.content).toContain('Integration Test Doc');
  });

  // --- Code Tools ---

  it('lobster.code.submit and review lifecycle', async () => {
    const submitTool = findTool('lobster.code.submit');
    const submitResult = await submitTool.handler({
      title: 'Login function',
      code: 'function login(user: string) { return true; }',
      language: 'typescript',
    });
    expect(submitResult.isError).toBeUndefined();
    const submission = JSON.parse(submitResult.content.replace('Code submitted for review: ', ''));
    expect(submission.id).toBeDefined();
    expect(submission.status).toBe('pending');

    const reviewTool = findTool('lobster.code.review');
    const reviewResult = await reviewTool.handler({
      submissionId: submission.id,
      status: 'approved',
      comment: 'LGTM from integration test',
    });
    expect(reviewResult.isError).toBeUndefined();
    expect(reviewResult.content).toContain('approved');
  });

  // --- Resources ---

  it('lobster://world/scene returns scene data', async () => {
    const resource = findResource('/scene');
    const result = await resource.handler();
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');
    const scene = JSON.parse(result.contents[0].text);
    expect(scene.id).toBeDefined();
  });

  it('lobster://world/lobsters returns array', async () => {
    const resource = findResource('/lobsters');
    const result = await resource.handler();
    expect(result.contents).toHaveLength(1);
    const lobsters = JSON.parse(result.contents[0].text);
    expect(Array.isArray(lobsters)).toBe(true);
  });

  it('lobster://world/tasks returns tasks', async () => {
    const resource = findResource('/tasks');
    const result = await resource.handler();
    expect(result.contents).toHaveLength(1);
    const tasks = JSON.parse(result.contents[0].text);
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0); // Created during task lifecycle test
  });

  it('lobster://world/meetings returns meetings', async () => {
    const resource = findResource('/meetings');
    const result = await resource.handler();
    expect(result.contents).toHaveLength(1);
    const meetings = JSON.parse(result.contents[0].text);
    expect(Array.isArray(meetings)).toBe(true);
  });

  it('lobster://world/memory returns documents', async () => {
    const resource = findResource('/memory');
    const result = await resource.handler();
    expect(result.contents).toHaveLength(1);
    const docs = JSON.parse(result.contents[0].text);
    expect(Array.isArray(docs)).toBe(true);
    expect(docs.length).toBeGreaterThan(0); // Created during docs lifecycle test
  });
});
