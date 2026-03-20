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
| S1 | Project scaffolding (Fastify + TypeScript + dev scripts) | 🔴 | — | — |
| S2 | WebSocket server + connection management | 🔴 | — | — |
| S3 | Lobster Registry (register, heartbeat, online status) | 🔴 | — | — |
| S4 | Scene Engine (spatial state, behavior broadcast) | 🔴 | — | — |
| S5 | Dialogue Router (create, message relay, turn management) | 🔴 | — | — |
| S6 | Circuit Breaker (turn/token limits, semantic repeat detection) | 🔴 | — | — |
| S7 | Mock lobster client (simulate 3 lobsters with random behaviors) | 🔴 | — | — |
| S8 | Frontend WebSocket endpoint (render events for 3D client) | 🔴 | — | — |

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
