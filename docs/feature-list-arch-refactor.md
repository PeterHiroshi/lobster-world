# Lobster World — Architecture Refactor Feature List

## Status Legend
- 🔴 Not started
- 🟡 In progress
- 🟢 Complete
- ⚫ Blocked

## R1: Protocol Package Split

| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| R1.1 | Split protocol/src/index.ts into domain modules | 🟢 | feature/arch-refactor | types/core.ts, types/dialogue.ts, types/social.ts, types/events.ts, types/lobby.ts, types/workforce.ts, constants.ts |
| R1.2 | Re-export all from index.ts (backward compatible) | 🟢 | feature/arch-refactor | Zero breaking changes to consumers |
| R1.3 | All existing tests still pass after split | 🟢 | feature/arch-refactor | 328/328 pass |

## R2: Zustand Store Slices

| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| R2.1 | Create slice architecture (lobsterSlice, dialogueSlice, lobbySlice, uiSlice, taskSlice) | 🟢 | feature/arch-refactor | 5 slices in store/slices/ |
| R2.2 | Migrate all state + actions to slices | 🟢 | feature/arch-refactor | Each slice owns its domain state |
| R2.3 | Compose slices in useWorldStore | 🟢 | feature/arch-refactor | create((...a) => ({ ...lobsterSlice(...a), ...dialogueSlice(...a), ... })) |
| R2.4 | Add selector hooks per slice | 🟢 | feature/arch-refactor | store/selectors.ts with 15+ convenience hooks |
| R2.5 | All existing tests pass, no behavior change | 🟢 | feature/arch-refactor | store.test.ts, lobby.test.tsx pass unmodified |

## R3: Environment Config (Frontend)

| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| R3.1 | Replace hardcoded URLs with import.meta.env | 🟢 | feature/arch-refactor | VITE_WS_VIEWER_URL, VITE_WS_SOCIAL_URL, VITE_API_BASE_URL |
| R3.2 | Add .env.example with defaults | 🟢 | feature/arch-refactor | localhost:3001 defaults |
| R3.3 | Update constants.ts to read env vars with fallbacks | 🟢 | feature/arch-refactor | import.meta.env.VITE_* ?? 'fallback' |

## R4: Server DI Container

| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| R4.1 | Create createApp() factory function | 🟢 | feature/arch-refactor | Returns { server, deps, start, shutdown } |
| R4.2 | Define AppDeps interface | 🟢 | feature/arch-refactor | All 14 engine instances typed |
| R4.3 | Refactor index.ts to use createApp() | 🟢 | feature/arch-refactor | index.ts is thin entry point |
| R4.4 | Enable test-friendly DI (pass mock deps) | 🟢 | feature/arch-refactor | createApp(partial) merges with defaults |

## R5: Code Splitting (Web Bundle)

| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| R5.1 | Lazy-load 3D scene (React.lazy + Suspense) | 🟢 | feature/arch-refactor | Scene loads on join, lobby loads instantly |
| R5.2 | Split vendor chunks (three.js, R3F separate) | 🟢 | feature/arch-refactor | manualChunks: three, r3f, vendor |
| R5.3 | Verify bundle sizes improved | 🟢 | feature/arch-refactor | three/r3f split from initial bundle |

## R6: Error Boundary + Input Validation

| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| R6.1 | Add React ErrorBoundary around Scene | 🟢 | feature/arch-refactor | Fallback UI with retry button |
| R6.2 | Add Fastify JSON schema validation on API routes | 🟢 | feature/arch-refactor | /api/audit, /api/events, POST /api/agents |
| R6.3 | Fix web test dependency (jsdom) | 🟢 | feature/arch-refactor | Already present in devDependencies |
| R6.4 | All 328+ tests pass after all changes | 🟢 | feature/arch-refactor | 268 server + 60 web = 328 pass |
