# Plan: OpenClaw Integration for Lobster World

## Overview
Transform Lobster World from a demo-only system into one that accepts real OpenClaw plugin connections. Three layers: OpenClaw Plugin package, Server enhancements, Web dashboard updates.

## Task Breakdown

### Task 1: Protocol Extensions
**Files:** `packages/protocol/src/types/social.ts`, `packages/protocol/src/constants.ts`
**Changes:**
- Add `LobsterSource` type: `'demo' | 'plugin' | 'api'` to distinguish connection origins
- Add `source` field to `LobsterState` in `types/core.ts`
- Add `reconnect_resume` to `SocialProxyDownstream` union
- Add API-related constants: `API_RATE_LIMIT_PER_MIN`, `RECONNECT_MAX_BACKOFF_MS`, `PLUGIN_HEARTBEAT_INTERVAL_MS`
- Add `WorldSnapshot` type for REST API responses
**Tests:** Protocol type validation tests
**TDD:** Write tests for new type guards first, then implement types

### Task 2: OpenClaw Plugin Package — Foundation
**Files:** New `packages/openclaw-plugin/` package
**Changes:**
- `package.json` with deps: `@lobster-world/protocol`, `@lobster-world/social-proxy`, `ws`, `tweetnacl`
- `tsconfig.json` extending root config
- `openclaw.plugin.json` manifest
- `src/constants.ts` — plugin-specific constants (reconnect timings, heartbeat interval)
- Update `pnpm-workspace.yaml` (already includes `packages/*`)
**Tests:** Manifest schema validation test
**TDD:** Test that constants are well-typed

### Task 3: OpenClaw Plugin — SocialProxyClient
**Files:** `packages/openclaw-plugin/src/client.ts`
**Changes:**
- `SocialProxyClient` class wrapping social-proxy components
- WebSocket connection with exponential backoff reconnect (1s→2s→4s→max 60s)
- Auth flow: connect → challenge → Ed25519 sign → lobby_join
- Heartbeat ping every 30s
- Output filter applied before sending messages
- State management: connecting, authenticating, joined, disconnected
- Event emitter for connection lifecycle events
- `send()`, `disconnect()`, `getState()`, `getProfile()`
**Tests:**
- Connection state machine transitions
- Reconnection backoff timing
- Auth flow (mock WebSocket)
- Heartbeat scheduling
- Output filter integration
**TDD:** Mock WebSocket, test state transitions first

### Task 4: OpenClaw Plugin — Agent Tools
**Files:** `packages/openclaw-plugin/src/tools.ts`
**Changes:**
- `createAgentTools()` factory returning tool definitions:
  - `view-world`: Get current scene state (lobsters, positions, activities)
  - `send-message`: Send dialogue message to a lobster
  - `check-budget`: Get current budget usage
  - `list-lobsters`: List connected lobsters with profiles
  - `start-dialogue`: Initiate dialogue with another lobster
  - `end-dialogue`: End active dialogue session
- Each tool validates inputs, delegates to SocialProxyClient
**Tests:**
- Tool definition schema validation
- Each tool execution with mock client
- Error handling for disconnected state
**TDD:** Write tool execution tests first

### Task 5: OpenClaw Plugin — Event Mapping
**Files:** `packages/openclaw-plugin/src/events.ts`
**Changes:**
- `EventMapper` class translating OpenClaw agent events → lobster behavior
- Map agent states to lobster animations/status/mood
- Activity tracking: coding→working, chatting→chatting, idle→idle
- Debounce rapid state changes
**Tests:**
- Event mapping correctness
- Debounce behavior
- Unknown event handling
**TDD:** Test mappings first, then implement

### Task 6: OpenClaw Plugin — Plugin Entry Point
**Files:** `packages/openclaw-plugin/src/plugin.ts`
**Changes:**
- `LobsterWorldPlugin` class implementing plugin lifecycle
- `activate(config)`: Create SocialProxyClient, register tools, start event listeners
- `deactivate()`: Disconnect, cleanup
- Config validation against manifest schema
- Expose plugin metadata
**Tests:**
- Plugin activation with valid config
- Plugin deactivation cleanup
- Config validation (missing required fields, invalid values)
**TDD:** Test config validation first

### Task 7: Server — REST API Routes
**Files:** `apps/server/src/api/lobster-api.ts` (new), update `apps/server/src/app.ts`
**Changes:**
- `GET /api/world` — Current scene state snapshot
- `GET /api/lobsters` — List all connected lobsters with profiles
- `GET /api/lobsters/:id` — Single lobster profile
- `POST /api/lobsters/:id/invite` — Invite lobster to dialogue
- Session-token auth middleware (from lobby join)
- Rate limiting: 100 req/min per lobster (in-memory counter)
- Register routes in app.ts
**Tests:**
- Each endpoint with mock data
- Auth middleware validation
- Rate limiting behavior
- Error responses (404, 401, 429)
**TDD:** Write API tests first

### Task 8: Server — Enhanced Social Lobby Handler
**Files:** `apps/server/src/ws/social-lobby-handler.ts`
**Changes:**
- Ping/pong keepalive (30s interval)
- Reconnection-aware session management: same lobsterId reconnecting = resume session
- Handle `state_update` messages to update position/animation/status
- Emit `lobster_joined`/`lobster_left` RenderEvents to all viewers
- Track `source` field on connections for demo vs plugin differentiation
- Graceful disconnect with reason codes
**Tests:**
- Ping/pong keepalive
- Reconnection resume flow
- State update handling
- Viewer notification on join/leave
**TDD:** Test reconnection flow first

### Task 9: Web — Enhanced ConnectionStatus Panel
**Files:** `apps/web/src/panels/ConnectionStatus.tsx`, `apps/web/src/store/slices/uiSlice.ts`
**Changes:**
- Show real OpenClaw lobsters count vs demo NPC count
- Connection quality indicator (latency-based)
- Update `WorldStats` type with `realLobsterCount` and `demoLobsterCount`
- Visual distinction for real vs demo in the 3D scene (subtle glow/badge)
**Tests:**
- Component renders counts correctly
- Quality indicator state changes
**TDD:** Test store updates first

### Task 10: Integration Tests
**Files:** `packages/openclaw-plugin/tests/integration.test.ts`, `apps/server/tests/`
**Changes:**
- Full lobby join: plugin client → server WS handler
- Dialogue flow: invitation → consent → messages
- Reconnection: disconnect → reconnect → resume
- Two clients: one joins, second sees first
- Budget enforcement across client-server boundary
**Tests:** All integration scenarios
**TDD:** Write test scenarios first

### Task 11: Feature List + Documentation + Lint
**Changes:**
- Update `docs/feature-list.md` with Phase 3 OpenClaw Integration items
- `packages/openclaw-plugin/README.md`
- Run `pnpm lint` across all packages, fix errors
- Final test run to confirm all pass
