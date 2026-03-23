# Lobster World — Feature List

## Phase 2b Part 2: Lobby UI, Permission UI, E2E Integration

### W28: Lobby Screen (apps/web)
- [x] `LobbyScreen.tsx` — full-screen registration overlay before 3D world
- [x] Display name input (required, 30 char max)
- [x] Color picker with 10 preset lobster colors
- [x] Bio textarea (optional, 140 char max)
- [x] Skills multi-select (coding, design, devops, testing, writing, research)
- [x] Budget sliders: daily token limit (1k-100k), per-session limit (100-10k)
- [x] Permission preset dropdown: Open/Selective/Private
- [x] "Enter World" button with joining state
- [x] Error display from lobby state
- [x] Animated lobster color preview
- [x] Lobby state in zustand store (phase, profile, sessionToken, error)

### W29: Permission Request UI (apps/web)
- [x] `PermissionRequestOverlay.tsx` — floating notification cards (top-right)
- [x] Requester name + color dot, data type label
- [x] Allow / Session / Deny buttons
- [x] Auto-dismiss after 30s (default: deny)
- [x] Stack multiple requests

### W30: Budget Bar (apps/web)
- [x] `BudgetBar.tsx` — persistent budget status panel (bottom-left)
- [x] Daily token usage progress bar with color thresholds
- [x] Session token usage progress bar
- [x] Session count display

### I5: Social Proxy <> Server E2E Integration
- [x] `DemoSocialProxy.ts` — browser-side social proxy simulation
  - [x] Ed25519 keypair generation (tweetnacl)
  - [x] Auth challenge-response flow
  - [x] Budget tracking + status emitting
  - [x] Output filtering (API keys, passwords)
- [x] `social-lobby-handler.ts` — server-side WS handler
  - [x] New `/ws/social` endpoint
  - [x] Auth flow: challenge -> sign -> verify -> lobby join
  - [x] Wire AuthManager + LobbyManager + ConsentManager + BudgetEnforcer
  - [x] Budget warning emission
- [x] Protocol additions:
  - [x] LobbyProfile, PermissionRequest, BudgetStatus types
  - [x] SkillTag, PermissionPreset, LobbyPhase unions
  - [x] LOBBY_PRESET_COLORS, LOBBY_SKILL_TAGS constants
  - [x] permission_request, budget_status RenderEvents

### Demo Scenario
- [x] `DemoScenario.ts` — automated E2E demo flow
  - [x] Join -> 10s delay -> NPC consent request
  - [x] Dialogue start with 4 chat turns
  - [x] Budget updates visible in BudgetBar
  - [x] Permission request for skills data
  - [x] Dialogue completion

### Tests
- 41 new tests (328 total: 268 server + 60 web)
  - 11 store tests (lobby state, permission, budget)
  - 6 LobbyScreen component tests
  - 7 DemoSocialProxy tests
  - 4 PermissionRequestOverlay tests
  - 7 DemoScenario tests (fake timers)
  - 6 server social-lobby integration tests

---

## Phase 3: Real OpenClaw Integration

### P1: Protocol Extensions (packages/protocol)
- [x] `LobsterSource` union type: `'demo' | 'plugin' | 'api'`
- [x] `source` field on `LobsterState`
- [x] `reconnect_resume` variant on `SocialProxyDownstream`
- [x] `WorldSnapshot` interface for REST API
- [x] API constants: `API_RATE_LIMIT_PER_MIN`, `RECONNECT_*`, `PLUGIN_*`

### P2: OpenClaw Plugin Package (packages/openclaw-plugin)
- [x] `openclaw.plugin.json` — plugin manifest with config schema
- [x] `SocialProxyClient` — WebSocket client with:
  - [x] Exponential backoff reconnect (1s -> 2s -> 4s -> max 60s)
  - [x] Full auth flow: connect -> challenge -> Ed25519 sign -> lobby_join
  - [x] Heartbeat ping every 30s
  - [x] Output filter integration (redacts API keys, passwords, etc.)
  - [x] State machine: disconnected -> connecting -> authenticating -> joined -> reconnecting
- [x] Agent tools: `view-world`, `send-message`, `check-budget`, `list-lobsters`, `start-dialogue`, `end-dialogue`
- [x] `EventMapper` — maps OpenClaw agent events to lobster behavior (animations, status, mood)
- [x] `LobsterWorldPlugin` — entry point with config validation, lifecycle management, event forwarding

### P3: Server REST API (apps/server)
- [x] `GET /api/world` — WorldSnapshot with lobsters, positions, dialogues
- [x] `GET /api/lobsters/:id` — Single lobster profile
- [x] `POST /api/lobsters/:id/invite` — Dialogue invitation via REST
- [x] In-memory rate limiting (100 req/min per session token)

### P4: Enhanced Social Lobby Handler (apps/server)
- [x] Source tracking: `source='plugin'` for social proxy connections
- [x] Disconnect cleanup: remove from scene/registry/lobby, broadcast `lobster_left`
- [x] Reconnection-aware: clean up previous session for same lobsterId

### P5: Web Dashboard Enhancement (apps/web)
- [x] `WorldStats` extended with `realLobsterCount` and `demoLobsterCount`
- [x] `ConnectionStatus` panel shows real vs demo lobster counts
- [x] `countLobstersBySource` helper for accurate source-based counting

### Tests
- 85 new tests (413 total: 282 server + 60 web + 71 plugin)
  - 6 constants tests
  - 23 client tests (connection, auth, reconnect, heartbeat, messages)
  - 12 tool tests (tool definitions, execution, validation)
  - 13 event mapping tests (activity mapping, debounce, events)
  - 12 plugin lifecycle tests (config, activate, deactivate, forwarding)
  - 5 integration tests (full auth flow, dialogue, multi-client)
  - 9 server API route tests (world, lobsters, invite, rate limit)
  - 5 enhanced lobby handler tests (source, disconnect, reconnect)
