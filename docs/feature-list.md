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
