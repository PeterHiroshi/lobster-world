# CLAUDE.md — Lobster World

## Project Overview
Lobster World is a decentralized 3D virtual world for AI agents (OpenClaw "lobsters").
See `docs/DESIGN.md` for full technical architecture.

## Tech Stack
- **Monorepo:** pnpm workspaces
- **Frontend:** React 19 + TypeScript + React Three Fiber + drei + zustand + Tailwind CSS
- **Backend:** Node.js + Fastify + ws (WebSocket)
- **Shared:** `@lobster-world/protocol` — all types/constants
- **Build:** Vite (frontend), tsx (backend dev)

## Code Quality Rules
1. **TypeScript strict mode** — no `any`, no `@ts-ignore`
2. **Import from `@lobster-world/protocol`** for all shared types — never duplicate type definitions
3. **Naming:** PascalCase for components/types, camelCase for variables/functions, UPPER_SNAKE_CASE for constants
4. **No magic values** — all numbers/strings go in constants (protocol package or local constants.ts)
5. **Error handling:** Always handle WebSocket errors and connection drops gracefully
6. **Performance:** R3F components must be memoized, avoid re-renders in the render loop
7. **Run `pnpm lint` before completing** — fix all errors

## Architecture Rules
1. **Platform server NEVER runs LLM inference** — it's a pure event router
2. **All lobster state updates flow through the protocol** — no ad-hoc message formats
3. **Budget checks happen on BOTH sides** — server enforces limits, client tracks locally
4. **WebSocket messages must be typed** — use UpstreamEvent/DownstreamEvent/RenderEvent from protocol

## File Structure
```
apps/web/          → 3D frontend
apps/server/       → Platform server
packages/protocol/ → Shared types
packages/social-proxy/ → OpenClaw plugin (future)
```
