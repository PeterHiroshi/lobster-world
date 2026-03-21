# Phase 1: Polish & Interactive Demo — Implementation Plan

## Overview
Enhance both server and web to create a visually impressive, interactive demo.
Branch: `feature/phase1-polish` from `develop`

## Execution Order
Features ordered by dependency: protocol types first, then server (no web deps), then web (depends on server events), then integration.

---

## Step 1: Protocol Type Extensions
**Files:** `packages/protocol/src/index.ts`

- [ ] 1.1 Add `AuditEventType` union type: `'lobster_join' | 'lobster_leave' | 'dialogue_start' | 'dialogue_message' | 'dialogue_end' | 'circuit_breaker_triggered'`
- [ ] 1.2 Add `AuditEvent` interface: `{ timestamp: number; eventType: AuditEventType; participants: string[]; details: string }`
- [ ] 1.3 Add new `RenderEvent` variants:
  - `{ type: 'dialogue_start'; sessionId: string; participants: string[]; intent: string }`
  - `{ type: 'dialogue_message'; sessionId: string; fromId: string; fromName: string; fromColor: string; content: string; turnNumber: number }`
  - `{ type: 'dialogue_end'; sessionId: string; reason: string }`
- [ ] 1.4 Add `AUDIT_RING_BUFFER_SIZE = 1000` constant
- [ ] 1.5 Add `MOCK_DIALOGUE_INTERVAL_MIN_MS = 30000` and `MOCK_DIALOGUE_INTERVAL_MAX_MS = 60000` constants

**Tests:** Protocol is types-only, no tests needed. TypeScript compiler validates.

---

## Step 2: S11 — CORS + Env Config
**Files:** `apps/server/src/config.ts`, `apps/server/src/index.ts`, `apps/server/package.json`

- [ ] 2.1 Install `@fastify/cors`
- [ ] 2.2 Update `config.ts`: add `CORS_ORIGINS` from `process.env.CORS_ORIGINS` (default: `['http://localhost:5173']`), parse comma-separated string
- [ ] 2.3 Update `index.ts`: register `@fastify/cors` plugin with configured origins
- [ ] 2.4 Write tests for config parsing (env var → array)

**Commit:** `feat(server): add CORS support and env config (S11)`

---

## Step 3: S10 — Audit Log
**Files:** `apps/server/src/engine/audit-log.ts` (new), `apps/server/src/api/routes.ts`, `apps/server/src/ws/lobster-handler.ts`, `apps/server/src/index.ts`

- [ ] 3.1 Create `AuditLog` class with ring buffer (array + head pointer, max 1000)
  - `log(event: AuditEvent): void`
  - `getRecent(count?: number): AuditEvent[]` (default: 100, returns newest first)
  - `getAll(): AuditEvent[]`
  - `clear(): void`
  - `size: number` getter
- [ ] 3.2 Add `GET /api/audit` route with optional `?count=N` query parameter
- [ ] 3.3 Wire audit log into `index.ts` — pass to handler and routes
- [ ] 3.4 Add audit log calls in `lobster-handler.ts` for: register, disconnect, dialogue_request, dialogue_message, dialogue_end, circuit breaker kill
- [ ] 3.5 Write tests: ring buffer overflow, getRecent ordering, clear, route response

**Commit:** `feat(server): add audit log with ring buffer and REST endpoint (S10)`

---

## Step 4: S9 — Enhanced Mock Dialogues
**Files:** `apps/server/src/mock/mock-lobsters.ts`, `apps/server/src/mock/dialogues.ts` (new), `apps/server/src/config.ts`

- [ ] 4.1 Create `dialogues.ts` with scripted multi-topic conversation scripts:
  - **Code review:** Cody leads, 6-8 turns about PR feedback, types, testing
  - **Architecture debate:** Phil leads, 6-8 turns about microservices vs monolith
  - **Coffee break small talk:** Suki leads, 4-6 turns about weekend, hobbies
  - **Bug hunting:** Cody + Phil, 6-8 turns debugging a race condition
  - Each script: `{ topic: string, initiator: PersonalityType, participants: PersonalityType[], turns: { speaker: PersonalityType, content: string }[] }`
- [ ] 4.2 Update `config.ts`: add dialogue interval constants (30-60s)
- [ ] 4.3 Refactor `MockLobsterClient` to use scripted dialogues:
  - New dialogue trigger: any lobster can initiate (not just social)
  - Pick random script, find partner, play turns sequentially with delays
  - Maintain personality-specific initiation weights
- [ ] 4.4 Broadcast `dialogue_start`, `dialogue_message`, `dialogue_end` RenderEvents to viewers
- [ ] 4.5 Write tests: dialogue script structure, personality matching, turn count

**Commit:** `feat(server): add enhanced multi-topic mock dialogues (S9)`

---

## Step 5: W11 — Improved Lobster Model
**Files:** `apps/web/src/components/Lobster.tsx`, `apps/web/src/lib/constants.ts`

- [ ] 5.1 Increase capsule segments: `capsuleGeometry args=[0.15, 0.3, 16, 32]` for smoother body
- [ ] 5.2 Add 4 pairs of legs (thin cylinders under body, positioned along body length)
  - Legs animate with walking cycle: alternating pairs move in opposite phase
  - Subtle idle animation: gentle sway
- [ ] 5.3 Improve claws: use two overlapping boxes per claw to create pincer shape
  - Upper jaw + lower jaw with slight angle
- [ ] 5.4 Eye pupils track camera: use `useFrame` to compute camera direction, offset pupils slightly toward camera
- [ ] 5.5 Add per-lobster idle variation: use lobster id hash to generate unique frequency/amplitude offsets
- [ ] 5.6 Add constants for leg dimensions, pupil tracking factor
- [ ] 5.7 Write render test: verify Lobster component renders with new geometry

**Commit:** `feat(web): improved lobster model with legs, pincers, eye tracking (W11)`

---

## Step 6: W12 — Particle Effects
**Files:** `apps/web/src/components/Particles.tsx` (new), `apps/web/src/components/Scene.tsx`, `apps/web/src/store/useWorldStore.ts`, `apps/web/src/lib/constants.ts`

- [ ] 6.1 Add `effects` array to store: `{ id: string; position: Vec3; type: 'sparkle' | 'confetti' | 'dust'; startTime: number }[]`
- [ ] 6.2 Handle `effect` RenderEvent to add effects to store; auto-remove after duration
- [ ] 6.3 Create `Particles.tsx` with three effect types:
  - **Sparkle burst:** drei `Sparkles` positioned between two chatting lobsters (on dialogue_start)
  - **Confetti:** small colored boxes that fall with gravity (on lobster_join)
  - **Ambient dust:** sparse floating particles always present in scene
- [ ] 6.4 Add `<Particles />` to Scene
- [ ] 6.5 Server: broadcast `effect` RenderEvent on dialogue_start and lobster_join
- [ ] 6.6 Write render test: Particles component renders

**Commit:** `feat(web): add particle effects for dialogues and joins (W12)`

---

## Step 7: W13 — Interactive Lobster Click
**Files:** `apps/web/src/components/Lobster.tsx`, `apps/web/src/components/LobsterDetailCard.tsx` (new), `apps/web/src/store/useWorldStore.ts`, `apps/web/src/lib/constants.ts`

- [ ] 7.1 Add `selectedLobsterId: string | null` to store with `setSelectedLobster` action
- [ ] 7.2 Add `lobsterStats` to store: `Record<string, { messagesSent: number; dialoguesParticipated: number }>` — increment on dialogue_message and dialogue_start events
- [ ] 7.3 Change Lobster onClick (single click) to set selectedLobster (keep double-click for camera focus)
- [ ] 7.4 Create `LobsterDetailCard.tsx`:
  - drei `Html` positioned near selected lobster
  - Shows: name, color swatch, skills (pills), activity, mood, stats
  - Close button + click-outside-to-dismiss
- [ ] 7.5 Add glow ring: `<mesh>` with `ringGeometry` on floor beneath selected lobster, subtle pulse animation
- [ ] 7.6 Write render tests: detail card shows on selection, dismiss works

**Commit:** `feat(web): interactive lobster click with detail card (W13)`

---

## Step 8: W14 — Lobby Entrance Animation
**Files:** `apps/web/src/components/Lobster.tsx`, `apps/web/src/store/useWorldStore.ts`, `apps/web/src/lib/constants.ts`

- [ ] 8.1 Add `entranceState` tracking per lobster in store: `Record<string, { spawnPos: Vec3; targetPos: Vec3; progress: number }>`
- [ ] 8.2 Define spawn point constant: `ENTRANCE_POSITION = { x: 0, y: 0, z: -10 }` (door area)
- [ ] 8.3 On `lobster_join`: set initial position to entrance, store target (desk position)
- [ ] 8.4 In Lobster component useFrame: if entrance animation active, lerp from spawn to desk position over ~2 seconds
- [ ] 8.5 Scale-up animation already exists (0→1), keep as is — just starts from entrance position
- [ ] 8.6 Trigger confetti particle effect at arrival
- [ ] 8.7 Write test: verify entrance state is set on join

**Commit:** `feat(web): lobby entrance animation for joining lobsters (W14)`

---

## Step 9: W17 — Dialogue Viewer Panel (Enhanced Chat Panel)
**Files:** `apps/web/src/panels/ChatPanel.tsx` (rewrite), `apps/web/src/store/useWorldStore.ts`, `apps/web/src/components/DialogueConnection.tsx` (new), `apps/web/src/components/Scene.tsx`

- [ ] 9.1 Add `activeDialogueMessages` to store: `Record<string, { participants: string[]; intent: string; messages: { fromId: string; fromName: string; fromColor: string; content: string; turnNumber: number; timestamp: number }[] }>`
- [ ] 9.2 Handle new RenderEvents in store:
  - `dialogue_start` → create entry in activeDialogueMessages
  - `dialogue_message` → append message to session
  - `dialogue_end` → mark session as ended (keep for display, remove after 10s)
- [ ] 9.3 Rewrite ChatPanel:
  - Each active dialogue as expandable card with header showing participants
  - Messages appear with typing indicator (animated dots) for 1s before showing content
  - Speaker name colored with lobster color
  - Auto-scroll to latest message
  - Max height with scrollbar
- [ ] 9.4 Create `DialogueConnection.tsx`: renders a subtle curved line between two chatting lobsters in 3D space using drei `Line` or custom tube geometry
- [ ] 9.5 Add `<DialogueConnection />` to Scene for each active dialogue
- [ ] 9.6 Write tests: store handles new events, panel renders messages

**Commit:** `feat(web): enhanced dialogue viewer panel with real-time messages (W17)`

---

## Step 10: I2 + I3 — Full Integration
**Files:** `apps/server/src/ws/lobster-handler.ts`, `apps/server/src/ws/viewer-handler.ts`, `apps/server/src/mock/mock-lobsters.ts`, `apps/web/src/panels/ActivityFeed.tsx` (new), `apps/web/src/App.tsx`

- [ ] 10.1 Ensure server broadcasts all new RenderEvent types to viewers (dialogue_start, dialogue_message, dialogue_end)
- [ ] 10.2 Add circuit breaker demo: one scripted dialogue intentionally repeats → gets killed → visible in UI
- [ ] 10.3 Create `ActivityFeed.tsx` panel: polls `GET /api/audit` every 5s, shows recent events as a scrollable feed
- [ ] 10.4 Add ActivityFeed to App.tsx layout
- [ ] 10.5 Manual integration test: start server + web, verify full flow

**Commit:** `feat: full Phase 1 integration with circuit breaker demo (I2+I3)`

---

## Step 11: W18 — Sound Effects (Optional)
**Files:** `apps/web/src/lib/audio.ts` (new), `apps/web/src/components/SoundToggle.tsx` (new), `apps/web/src/App.tsx`

- [ ] 11.1 Create audio manager using Web Audio API (no external deps)
  - Procedural sounds: ambient hum (low-pass filtered noise), typing clicks (short noise bursts), chat ping (sine wave envelope)
- [ ] 11.2 Create `SoundToggle.tsx`: mute/unmute button in UI corner
- [ ] 11.3 Trigger sounds on events: dialogue_start → ping, working animation → typing clicks
- [ ] 11.4 Add to App.tsx
- [ ] 11.5 Write test: SoundToggle renders and toggles state

**Commit:** `feat(web): add sound effects with mute toggle (W18)`

---

## Step 12: Final Verification
- [ ] 12.1 Run `npx pnpm@10.12.1 --filter @lobster-world/server test` — all tests pass
- [ ] 12.2 Run `npx pnpm@10.12.1 --filter @lobster-world/web test` — all tests pass
- [ ] 12.3 Run `npx pnpm@10.12.1 lint` — no errors
- [ ] 12.4 Update `feature-list.md` with all completed features
- [ ] 12.5 Update `.dev-progress/progress.md`
- [ ] 12.6 Rebase on develop and push

**Commit:** `chore: update feature list and progress for Phase 1`

---

## Risk Mitigation
- **drei API changes:** Pin to @react-three/drei ^10.0.0 (already installed)
- **Particle performance:** Use instanced meshes, limit particle count (max 50 per effect)
- **Store complexity:** Keep new state flat, avoid nested objects where possible
- **Sound autoplay:** Web Audio requires user gesture — show "click to enable audio" on first interaction

## Dependencies to Install
- Server: `@fastify/cors`
- Web: none (all deps already available)
