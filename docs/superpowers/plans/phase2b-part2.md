# Phase 2b Part 2 — Lobby UI, Permission UI, E2E Integration

## Overview
Add browser-side lobby/join flow, permission request UI, and wire server-side auth/lobby/consent/budget into real WebSocket flow with a demo scenario.

## Tasks

### T1: Protocol Additions
- [ ] Add new RenderEvent types: `lobby_result`, `permission_request`, `budget_status`
- [ ] Add `LobbyProfile` type for frontend lobby form data
- [ ] Add constants: `LOBBY_PRESET_COLORS`, `LOBBY_SKILL_TAGS`, `PERMISSION_AUTO_DISMISS_MS`, `BIO_MAX_LENGTH`, `BUDGET_DAILY_MIN/MAX`, `BUDGET_SESSION_MIN/MAX`

### T2: Store — Lobby State
- [ ] Add `lobbyState` to WorldState: `{ phase: 'lobby'|'joining'|'joined', profile: LobbyProfile|null, sessionToken: string|null, error: string|null }`
- [ ] Add `permissionRequests` array to state
- [ ] Add actions: `setLobbyPhase`, `setLobbyProfile`, `setLobbyError`, `setSessionToken`, `addPermissionRequest`, `resolvePermissionRequest`
- [ ] Add `budgetStatus` to state
- [ ] Write tests: 8-10 tests for lobby state transitions and permission requests

### T3: LobbyScreen Component
- [ ] `LobbyScreen.tsx` — full-screen overlay, hidden when phase=joined
- [ ] Display name input, color picker (preset swatches), bio textarea (140 chars)
- [ ] Skills multi-select (coding, design, devops, testing, writing, research)
- [ ] Budget sliders: daily token limit (1k-100k), per-session (100-10k)
- [ ] Permission preset dropdown: Open/Selective/Private
- [ ] "Enter World" button, error display, connection status
- [ ] Animated lobster preview with chosen color
- [ ] Write tests: 4-6 render + interaction tests

### T4: DemoSocialProxy (Browser-side)
- [ ] `apps/web/src/lib/DemoSocialProxy.ts` — orchestrates auth+lobby+consent+budget in browser
- [ ] Ed25519 keypair generation using tweetnacl
- [ ] Auth challenge-response: send lobby_join with SocialProxyUpstream, handle auth_challenge, sign nonce, receive lobby_result
- [ ] Local profile with data partitioning
- [ ] Budget tracking (wraps BudgetCounter from social-proxy package or reimplements simply)
- [ ] Output filtering (wraps OutputFilter)
- [ ] Write tests: 6-8 tests for auth flow, budget, filtering

### T5: PermissionRequestOverlay
- [ ] `PermissionRequestOverlay.tsx` — floating notification cards stacked in top-right
- [ ] Shows: requester name + color dot, data type, Allow/Deny/Allow-for-session
- [ ] Auto-dismiss after 30s (default: deny)
- [ ] Stack multiple requests with animation
- [ ] Write tests: 3-4 render tests

### T6: Server Integration — Wire Auth/Lobby/Consent/Budget into WS
- [ ] Add `SocialProxyUpstream` handler to lobster-handler (lobby_join, dialogue_response, budget_report)
- [ ] Create `social-lobby-handler.ts` — handles SocialProxyUpstream events, uses AuthManager + LobbyManager + ConsentManager + BudgetEnforcer
- [ ] Auth flow: on lobby_join → create challenge → send auth_challenge → verify response → process lobby join → send lobby_result
- [ ] Wire consent: on dialogue_request from NPC → send dialogue_invitation → wait for dialogue_response → resolve consent
- [ ] Wire budget: register lobster budget on join, track tokens, emit warnings
- [ ] Write tests: 8-10 integration tests

### T7: App Integration
- [ ] Modify `App.tsx`: show LobbyScreen when phase!=joined, show 3D scene when phase=joined
- [ ] Add PermissionRequestOverlay over 3D scene
- [ ] Wire useWebSocket to use DemoSocialProxy for connection
- [ ] Fade transition between lobby and 3D scene

### T8: Demo Scenario
- [ ] After join, 10s delay → NPC initiates dialogue consent request
- [ ] Chat exchange (3-5 turns with simulated responses)
- [ ] Budget visible and updating in UI
- [ ] Permission request triggered mid-dialogue
- [ ] Update feature-list.md

### T9: Final Verification
- [ ] `pnpm lint` passes
- [ ] All 287+ existing tests pass
- [ ] New tests pass (target: 20-30 new tests)
- [ ] Push feature branch
