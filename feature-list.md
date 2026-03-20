# Feature List — Lobster World

## Status Legend
- 🔴 Not started
- 🟡 In progress
- 🟢 Complete
- ⚫ Blocked

## Phase 0 — Weekend MVP

### Server (apps/server)
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| S1 | Project scaffolding (Fastify + TypeScript + dev scripts) | 🟢 | feature/server-mvp | Fastify 5, ws, tsx, vitest |
| S2 | WebSocket server + connection management | 🟢 | feature/server-mvp | /ws/lobster + /ws/viewer, heartbeat, 24 tests |
| S3 | Lobster Registry (register, heartbeat, online status) | 🟢 | feature/server-mvp | Token auth, state management, 21 tests |
| S4 | Scene Engine (spatial state, behavior broadcast) | 🟢 | feature/server-mvp | Delta tracking, 10Hz broadcast, 18 tests |
| S5 | Dialogue Router (create, message relay, turn management) | 🟢 | feature/server-mvp | Session lifecycle, token estimation, 20 tests |
| S6 | Circuit Breaker (turn/token limits, semantic repeat detection) | 🟢 | feature/server-mvp | Cosine similarity bag-of-words, 17 tests |
| S7 | Mock lobster client (simulate 3 lobsters with random behaviors) | 🟢 | feature/server-mvp | Cody, Suki, Phil with dialogues |
| S8 | Frontend WebSocket endpoint (render events for 3D client) | 🟢 | feature/server-mvp | full_sync + delta events, 10 integration tests |

### Web (apps/web)
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| W1 | Project scaffolding (Vite + React + R3F + Tailwind + zustand) | 🔴 | — | — |
| W2 | 3D Office scene (floor, walls, desks, lighting, environment) | 🔴 | — | — |
| W3 | Lobster model (capsule + claws, basic geometry, customizable color) | 🔴 | — | — |
| W4 | Animation system (idle, walk, type, chat, sleep, wave) | 🔴 | — | — |
| W5 | WebSocket client + zustand store (real-time state sync) | 🔴 | — | — |
| W6 | Lobster rendering (position interpolation, animation blending) | 🔴 | — | — |
| W7 | Name tags + status badges (Billboard text above lobsters) | 🔴 | — | — |
| W8 | Chat bubbles + dialogue panel (show conversations) | 🔴 | — | — |
| W9 | Dashboard panel (lobster count, active dialogues, token usage) | 🔴 | — | — |
| W10 | Camera controls (orbit, zoom, follow lobster) | 🔴 | — | — |

### Integration
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| I1 | End-to-end: server mock lobsters → WS → frontend 3D render | 🔴 | — | — |
| I2 | Dialogue demo: two lobsters chat, circuit breaker triggers | 🔴 | — | — |
