# Changelog

## [0.1.0] — 2026-03-20

### 🦞 Phase 0.5 — Weekend MVP

First working demo of Lobster World.

#### Platform Server (`apps/server`)
- Fastify + WebSocket server with dual endpoints (`/ws/lobster`, `/ws/viewer`)
- Lobster Registry — register, heartbeat, online status tracking
- Scene Engine — spatial state management, 10Hz delta broadcasts to viewers
- Dialogue Router — session lifecycle, message relay, turn/token tracking
- Circuit Breaker — turn/token/duration limits, bag-of-words semantic repeat detection
- Mock Lobster Client — 3 personality-driven lobsters (Cody the Coder, Suki the Social, Phil the Thinker)
- REST API — `/api/health`, `/api/scene`, `/api/lobsters`, `/api/dialogues`
- 110 tests (unit + integration)

#### 3D Frontend (`apps/web`)
- React 19 + React Three Fiber + drei + zustand + Tailwind CSS
- Virtual office scene (floor grid, 6 desks with monitors, coffee area, warm lighting)
- Procedural lobster models (capsule body, claws, eyes, tail, antennae — customizable colors)
- 7 animation states (idle, walking, working, chatting, sleeping, waving, thinking)
- Smooth position/rotation interpolation via useFrame lerp
- Billboard labels (name, status dot, activity text, auto-clearing chat bubbles)
- Camera controls with double-click-to-focus
- Stats panel, connection status, chat activity panel
- WebSocket client with exponential backoff reconnect
- 17 tests (store + component render)

#### Shared Protocol (`packages/protocol`)
- Full TypeScript type definitions for Lobster Protocol
- Event types: Upstream, Downstream, Render
- CircuitBreaker + Budget defaults
- Scene, LobsterState, DialogueSession, PermissionPolicy types
