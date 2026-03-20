# Web MVP Implementation Plan

## Overview
Build the 3D frontend for Lobster World: React Three Fiber app that renders AI lobsters in a virtual office, connected to the platform server via WebSocket.

## Task Breakdown

### Task 1: Project Scaffold (3 min)
**Files:** `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.js`, `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/index.css`

- [ ] Create `apps/web/package.json` with all deps (react 19, r3f, drei, zustand, tailwind, vite, vitest, @testing-library/react, three, @types/three)
- [ ] Create `apps/web/tsconfig.json` (strict mode, ESM)
- [ ] Create `apps/web/vite.config.ts` (React plugin, dev port 5173)
- [ ] Create `apps/web/tailwind.config.ts` + `postcss.config.js`
- [ ] Create `apps/web/index.html` (entry point)
- [ ] Create `apps/web/src/main.tsx` (ReactDOM.createRoot)
- [ ] Create `apps/web/src/App.tsx` (placeholder layout)
- [ ] Create `apps/web/src/index.css` (Tailwind imports)
- [ ] Run `pnpm install` from monorepo root
- [ ] Verify `pnpm --filter @lobster-world/web dev` starts without errors
- [ ] **Commit:** `feat(web): scaffold Vite + React + R3F project`

### Task 2: Constants + Zustand Store (4 min)
**Files:** `apps/web/src/lib/constants.ts`, `apps/web/src/store/useWorldStore.ts`, `apps/web/tests/store.test.ts`

- [ ] Create `apps/web/src/lib/constants.ts` — WS URL, reconnect params, bubble timeout, lerp factor, animation params
- [ ] Create `apps/web/src/store/useWorldStore.ts` — zustand store with:
  - State: `lobsters: Map<string, LobsterState>`, `dialogues: DialogueSession[]`, `connectionStatus`, `stats`
  - Actions: `handleRenderEvent(event: RenderEvent)`, `setConnectionStatus`, `clearBubble(id)`
  - RenderEvent dispatch: full_sync, lobster_join, lobster_leave, lobster_update, dialogue_bubble
- [ ] Create `apps/web/tests/store.test.ts` — TDD tests:
  - full_sync populates lobsters map
  - lobster_join adds lobster
  - lobster_leave removes lobster
  - lobster_update merges delta
  - dialogue_bubble sets bubbleText
  - connection status updates
- [ ] Run tests, all green
- [ ] **Commit:** `feat(web): add zustand world store with tests`

### Task 3: WebSocket Hook (3 min)
**Files:** `apps/web/src/hooks/useWebSocket.ts`

- [ ] Create `apps/web/src/hooks/useWebSocket.ts`:
  - Connect to `WS_VIEWER_URL` from constants
  - Parse JSON messages as RenderEvent, dispatch to store
  - Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s — max 5 retries)
  - Update connectionStatus in store (connecting, connected, disconnected, error)
  - Cleanup on unmount
- [ ] Wire into App.tsx (call useWebSocket at top level)
- [ ] **Commit:** `feat(web): add WebSocket viewer hook with reconnect`

### Task 4: 3D Office Scene (4 min)
**Files:** `apps/web/src/components/Scene.tsx`, `apps/web/src/components/Office.tsx`

- [ ] Create `apps/web/src/components/Scene.tsx`:
  - R3F `<Canvas>` with camera position [8, 8, 8] looking at [0, 0, 0]
  - drei `<OrbitControls>` with damping
  - drei `<Environment>` preset "studio" or "apartment"
  - Render `<Office />` and `<LobsterRenderer />`
- [ ] Create `apps/web/src/components/Office.tsx`:
  - Floor: 20x20 PlaneGeometry, light gray, rotation -Math.PI/2
  - Grid: drei `<Grid>` helper or manual lines
  - 6 desks in 2 rows of 3 (box geometry: desk surface + legs), each with monitor box
  - Coffee area: small table with different colored floor patch
  - Lighting: ambientLight (0.5), directionalLight with shadow
- [ ] Integrate Scene into App.tsx
- [ ] **Commit:** `feat(web): add 3D office scene with desks and lighting`

### Task 5: Lobster 3D Model + Animations (5 min)
**Files:** `apps/web/src/components/Lobster.tsx`, `apps/web/src/components/LobsterAnimator.tsx`, `apps/web/src/components/LobsterLabel.tsx`

- [ ] Create `apps/web/src/components/Lobster.tsx` — procedural geometry:
  - Body: CapsuleGeometry (radius 0.15, length 0.3)
  - Claws: 2 BoxGeometry (0.08 x 0.04 x 0.12) angled at front
  - Eyes: 2 SphereGeometry (0.04) on top, with black pupil spheres (0.02)
  - Tail: ConeGeometry at back
  - Antennae: 2 thin CylinderGeometry from head
  - All wrapped in `<group>`, memoized with React.memo
  - Color from lobster.profile.color
- [ ] Create `apps/web/src/components/LobsterAnimator.tsx` — useFrame hook:
  - idle: sine bob (0.05 amplitude, speed 2)
  - walking: bob + rotate toward target + lerp translate
  - working: tilt forward, claws oscillate rapidly
  - chatting: face partner, sway, periodic claw gesture
  - sleeping: tilt side, very slow sine
  - waving: one claw raised + rotating
  - thinking: claw on chin, slow tilt
  - Position lerp (factor 0.05) for smooth movement
  - Enter/exit scale animation
- [ ] Create `apps/web/src/components/LobsterLabel.tsx` — drei `<Html>`:
  - Name tag (white text, dark background)
  - Status dot (green/yellow/gray/red based on status)
  - Activity text (smaller)
  - Chat bubble (when bubbleText set, auto-hide after 5s via store)
- [ ] Create lobster renderer loop in Scene (map over store lobsters)
- [ ] **Commit:** `feat(web): add procedural lobster model with animations`

### Task 6: Camera Controller (2 min)
**Files:** `apps/web/src/components/CameraController.tsx`

- [ ] Create `apps/web/src/components/CameraController.tsx`:
  - Store focusTarget in zustand (lobsterId or null)
  - On focus: lerp camera position to lobster + offset
  - Double-click lobster to focus (add onClick to lobster group)
  - Click empty space to reset camera
- [ ] Integrate into Scene
- [ ] **Commit:** `feat(web): add camera controller with lobster focus`

### Task 7: UI Panels (4 min)
**Files:** `apps/web/src/panels/StatsPanel.tsx`, `apps/web/src/panels/ChatPanel.tsx`, `apps/web/src/panels/ConnectionStatus.tsx`

- [ ] Create `apps/web/src/panels/StatsPanel.tsx`:
  - Top bar: lobster count, dialogue count, message count
  - Styled with Tailwind (fixed top, semi-transparent bg)
- [ ] Create `apps/web/src/panels/ConnectionStatus.tsx`:
  - Green/red dot + status text
  - Server URL display
- [ ] Create `apps/web/src/panels/ChatPanel.tsx`:
  - Right side panel, collapsible
  - List active dialogues from store
  - Click to expand: show messages, participants, turn count, tokens
  - Auto-scroll to latest
  - Styled with Tailwind
- [ ] Integrate all panels into App.tsx layout
- [ ] **Commit:** `feat(web): add stats, connection, and chat panels`

### Task 8: Component Tests (3 min)
**Files:** `apps/web/tests/components.test.tsx`, `apps/web/vitest.config.ts` (if needed)

- [ ] Setup vitest with jsdom/happy-dom environment
- [ ] Test: store handles all RenderEvent types correctly (already done in Task 2)
- [ ] Test: App renders without crashing
- [ ] Test: StatsPanel displays correct counts
- [ ] Test: ConnectionStatus shows correct state
- [ ] Run all tests, all green
- [ ] **Commit:** `test(web): add component render tests`

### Task 9: Integration + Polish (3 min)
- [ ] Start server: `pnpm --filter @lobster-world/server dev`
- [ ] Start web: `pnpm --filter @lobster-world/web dev`
- [ ] Verify: WebSocket connects, full_sync received, lobsters render in 3D
- [ ] Verify: Lobsters animate (idle, walking, etc.)
- [ ] Verify: Chat panel shows dialogue activity
- [ ] Verify: Stats update in real-time
- [ ] Run `pnpm --filter @lobster-world/web lint` (if lint script exists)
- [ ] Fix any issues found
- [ ] **Commit:** `fix(web): integration polish and fixes`

### Task 10: Progress + Feature List Update (2 min)
- [ ] Update `.dev-progress/progress.md`
- [ ] Update `feature-list.md` (or create if needed)
- [ ] Final commit: `docs: update progress and feature list for web MVP`
- [ ] Push branch: `git push -u origin feature/web-mvp --force-with-lease`

## Dependencies
- Task 1 must complete first (scaffold)
- Tasks 2-3 can happen in sequence (store then hook)
- Tasks 4-5 can happen in sequence (scene then lobsters)
- Tasks 6-7 can be parallelized
- Task 8 depends on all component tasks
- Task 9 depends on everything
- Task 10 is final

## Risk Mitigation
- R3F v9 API may differ from v8 — check drei/fiber docs if issues arise
- Tailwind v4 uses new config format — use `@import "tailwindcss"` in CSS
- Three.js types need `@types/three` aligned with three.js version
- Protocol package uses source exports (no build step needed for dev)
