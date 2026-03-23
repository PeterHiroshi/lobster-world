# Plan: MCP Server for Lobster World

## Overview
Implement a standard MCP (Model Context Protocol) server that allows ANY MCP-compatible AI agent to connect and interact with Lobster World. The MCP server connects to the platform server via WebSocket + REST and exposes tools/resources via stdio transport.

## Architecture
```
AI Agent (Claude Desktop / ChatGPT / etc.)
    ↕ MCP Protocol (stdio)
MCP Server (packages/mcp-server)
    ↕ WebSocket + REST API
Lobster World Platform Server (apps/server)
```

## Task Breakdown

### Task 1: Package Scaffold + Git Branch
**Files:** `packages/mcp-server/package.json`, `tsconfig.json`, `src/constants.ts`, `bin/lobster-mcp`
**Changes:**
- Create feature branch `feature/mcp-server` from develop
- Scaffold `packages/mcp-server/` with package.json (deps: `@modelcontextprotocol/sdk`, `@lobster-world/protocol`, `ws`, `tweetnacl`)
- tsconfig.json extending root
- `src/constants.ts` — env var names, default URLs, config defaults
- `bin/lobster-mcp` — CLI entry shebang
- vitest.config.ts
**Tests:** Constants validation tests
**TDD:** Write tests for constants first

### Task 2: Server Enhancements — DocManager + CodeReviewManager
**Files:** `apps/server/src/engine/docs.ts`, `apps/server/src/engine/code-review.ts`
**Changes:**
- `DocManager` — in-memory document/collective memory CRUD:
  - `createDoc(opts)`, `getDoc(id)`, `getAllDocs()`, `updateDoc(id, partial)`, `deleteDoc(id)`, `getDocsByCategory(cat)`, `searchDocs(query)`
  - MemoryEntry type: id, category, title, content, author, createdAt, updatedAt, tags
- `CodeReviewManager` — code submission and review workflow:
  - `submitCode(opts)`, `getSubmission(id)`, `getAllSubmissions()`, `reviewCode(id, review)`, `getSubmissionsByStatus(status)`
  - CodeSubmission type: id, title, code, language, author, reviewerId?, status, comments[], createdAt
**Tests:** Unit tests for both managers
**TDD:** RED → GREEN → REFACTOR

### Task 3: Server Enhancements — New REST Endpoints
**Files:** `apps/server/src/api/routes.ts`, `apps/server/src/app.ts`
**Changes:**
- Add DocManager + CodeReviewManager to app dependency injection
- New REST endpoints:
  - `GET /api/docs` — list documents (filter by ?category, ?tag)
  - `GET /api/docs/:id` — read document
  - `POST /api/docs` — create document
  - `PUT /api/docs/:id` — update document
  - `DELETE /api/docs/:id` — delete document
  - `POST /api/code/submit` — submit code for review
  - `GET /api/code/submissions` — list submissions
  - `GET /api/code/:id` — get submission
  - `POST /api/code/:id/review` — review submission
  - `POST /api/tasks/:id/assign` — assign task
  - `DELETE /api/meetings/:id` — end meeting
**Tests:** REST endpoint tests
**TDD:** Write endpoint tests first

### Task 4: Protocol Extensions — MCP Types
**Files:** `packages/protocol/src/types/mcp.ts`, `packages/protocol/src/index.ts`
**Changes:**
- Add MemoryEntry, CodeSubmission, CodeReview types to protocol
- Add MCP-related constants
- Re-export from index.ts
**Tests:** Type guard tests
**TDD:** Write type validation tests first

### Task 5: MCP Server — Platform Client
**Files:** `packages/mcp-server/src/client.ts`
**Changes:**
- `PlatformClient` class:
  - WebSocket connection to `/ws/social` (reuse Ed25519 auth flow from openclaw-plugin)
  - REST client methods for all `/api/*` endpoints
  - Event emitter for downstream WS events
  - Auto-reconnect with backoff
  - Methods: `connect()`, `disconnect()`, `isConnected()`
  - REST helpers: `getTasks()`, `createTask()`, `updateTask()`, `assignTask()`, `getMeetings()`, `createMeeting()`, `endMeeting()`, `getDocs()`, `getDoc()`, `createDoc()`, `updateDoc()`, `submitCode()`, `reviewCode()`, `getWorldStatus()`, `getLobsters()`, `sendMessage()`
**Tests:** Mock WS server + REST, test all methods
**TDD:** RED → GREEN → REFACTOR

### Task 6: MCP Server — World Tools
**Files:** `packages/mcp-server/src/tools/world.ts`
**Changes:**
- `lobster.world.status` — GET /api/world, return scene state
- `lobster.world.join` — Connect to platform via WS, register
- `lobster.world.leave` — Disconnect from platform
- `lobster.status.update` — Send state_update via WS
**Tests:** Mock platform client, test all tools
**TDD:** RED → GREEN → REFACTOR

### Task 7: MCP Server — Task Tools
**Files:** `packages/mcp-server/src/tools/tasks.ts`
**Changes:**
- `lobster.tasks.list` — GET /api/tasks with filters
- `lobster.tasks.create` — POST /api/tasks
- `lobster.tasks.update` — PUT /api/tasks/:id + POST /api/tasks/:id/transition
- `lobster.tasks.assign` — POST /api/tasks/:id/assign
**Tests:** Mock platform client, test all tools
**TDD:** RED → GREEN → REFACTOR

### Task 8: MCP Server — Chat Tools
**Files:** `packages/mcp-server/src/tools/chat.ts`
**Changes:**
- `lobster.chat.send` — POST /api/messages (direct)
- `lobster.chat.broadcast` — POST /api/messages (broadcast)
- `lobster.meeting.start` — POST /api/meetings
- `lobster.meeting.end` — DELETE /api/meetings/:id
**Tests:** Mock platform client, test all tools
**TDD:** RED → GREEN → REFACTOR

### Task 9: MCP Server — Docs & Code Tools
**Files:** `packages/mcp-server/src/tools/docs.ts`, `packages/mcp-server/src/tools/code.ts`
**Changes:**
- `lobster.docs.read` — GET /api/docs/:id
- `lobster.docs.write` — POST/PUT /api/docs
- `lobster.code.submit` — POST /api/code/submit
- `lobster.code.review` — POST /api/code/:id/review
**Tests:** Mock platform client, test all tools
**TDD:** RED → GREEN → REFACTOR

### Task 10: MCP Server — Resources
**Files:** `packages/mcp-server/src/resources/scene.ts`, `lobsters.ts`, `tasks.ts`, `memory.ts`
**Changes:**
- `lobster://world/scene` — Current scene state JSON
- `lobster://world/lobsters` — All connected lobsters
- `lobster://world/tasks` — All active tasks
- `lobster://world/meetings` — Active meetings
- `lobster://world/memory` — Collective memory entries
**Tests:** Mock platform client, test all resources
**TDD:** RED → GREEN → REFACTOR

### Task 11: MCP Server — Server Entry Point + Registration
**Files:** `packages/mcp-server/src/server.ts`, `packages/mcp-server/src/index.ts`
**Changes:**
- `server.ts` — MCP Server class:
  - Register all tools with input schemas (zod)
  - Register all resources with URI templates
  - Wire tool handlers to PlatformClient
  - Wire resource handlers to PlatformClient
- `index.ts` — Entry point:
  - Parse env vars for config
  - Create PlatformClient
  - Create MCP Server
  - Start stdio transport
**Tests:** Server integration tests (tool registration, resource listing)
**TDD:** RED → GREEN → REFACTOR

### Task 12: Integration Tests
**Files:** `packages/mcp-server/tests/integration.test.ts`
**Changes:**
- Spin up real Lobster World server (port 0)
- Create MCP server connected to it
- Test full flow: join → create task → send message → read resource → leave
- Test error handling: server down, invalid params
**Tests:** Full integration test suite

### Task 13: README + Feature List + Lint + Push
**Files:** `packages/mcp-server/README.md`, `feature-list.md`
**Changes:**
- README with Claude Desktop config, standalone usage, env vars, tool/resource docs
- Update feature-list.md with MCP Server section
- Run `pnpm lint` across monorepo, fix issues
- Final commit and push

## Dependencies
- `@modelcontextprotocol/sdk` — Official MCP TypeScript SDK
- `@lobster-world/protocol` — Shared types
- `ws` — WebSocket client
- `tweetnacl` — Ed25519 auth
- `zod` — Input validation for MCP tools

## Testing Strategy
- Unit tests: Mock PlatformClient for tool/resource tests
- Integration tests: Real server + MCP server, full flow
- All tests via vitest
