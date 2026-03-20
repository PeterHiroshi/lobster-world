# Platform Server MVP — Implementation Plan

## Tasks

### Task 1: Server Scaffolding
- [x] Create `apps/server/package.json` with dependencies
- [x] Create `apps/server/tsconfig.json`
- [x] Create `apps/server/src/config.ts` (all constants)
- [x] Create `apps/server/src/index.ts` (minimal Fastify startup)
- [x] `pnpm install` succeeds
- **Verify:** Server starts and responds to GET /api/health

### Task 2: Connection Manager
- [x] Create `apps/server/src/ws/connection-manager.ts`
- [x] Track lobster + viewer connections with metadata
- [x] Heartbeat ping/pong at 30s interval
- [x] Disconnect handling with cleanup
- [x] Unit test: `tests/connection-manager.test.ts`

### Task 3: Lobster Registry
- [x] Create `apps/server/src/engine/registry.ts`
- [x] Register lobster with PublicProfile + token
- [x] Track online/offline, store LobsterState
- [x] List all lobsters
- [x] Unit test: `tests/registry.test.ts`

### Task 4: Scene Engine
- [x] Create `apps/server/src/engine/scene.ts`
- [x] Single scene management (office)
- [x] Position/animation/activity tracking
- [x] Delta broadcast computation at 10Hz
- [x] Handle join/leave
- [x] Unit test: `tests/scene.test.ts`

### Task 5: Dialogue Router
- [x] Create `apps/server/src/engine/dialogue.ts`
- [x] Create/accept/reject dialogue sessions
- [x] Relay messages, track turns + token estimates
- [x] End sessions on budget/disconnect
- [x] Unit test: `tests/dialogue.test.ts`

### Task 6: Circuit Breaker
- [x] Create `apps/server/src/engine/circuit-breaker.ts`
- [x] Per-session limits (turns, tokens, duration)
- [x] Per-lobster limits (concurrent sessions, cooldown)
- [x] Semantic repeat detection (bag-of-words cosine similarity)
- [x] Unit test: `tests/circuit-breaker.test.ts`

### Task 7: WebSocket Handlers
- [x] Create `apps/server/src/ws/lobster-handler.ts`
- [x] Create `apps/server/src/ws/viewer-handler.ts`
- [x] Route UpstreamEvent messages to engine components
- [x] Send DownstreamEvent + RenderEvent messages

### Task 8: REST API Routes
- [x] Create `apps/server/src/api/routes.ts`
- [x] GET /api/scene, /api/lobsters, /api/dialogues, /api/health

### Task 9: Server Integration
- [x] Wire all components in `apps/server/src/index.ts`
- [x] Fastify + ws on same port
- [x] Graceful shutdown

### Task 10: Mock Lobster Client
- [x] Create `apps/server/src/mock/mock-lobsters.ts`
- [x] 3 personalities: Coder, Social, Thinker
- [x] Random behavior transitions (5-15s)
- [x] Scripted dialogue exchanges

### Task 11: Integration + E2E Tests
- [x] `tests/integration.test.ts` — WS connect + message flow
- [x] E2E: server + mock lobsters + viewer

### Task 12: Final Verification
- [x] `pnpm lint` passes
- [x] All tests pass
- [x] Feature list updated
- [x] Progress.md updated
