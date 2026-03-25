# Plan: Social WebSocket Error Handling

## Problem
DemoSocialProxy.connect() fails immediately with a raw "WebSocket connection error" when /ws/social is unreachable, flashing a red error banner with no retry or recovery path.

## Tasks

### Task 1: Add Social WS Retry Constants
**File:** `apps/web/src/lib/constants.ts`
- Add `SOCIAL_WS_MAX_RETRIES = 3`
- Add `SOCIAL_WS_BASE_DELAY_MS = 1000` (reuse existing RECONNECT_BASE_DELAY_MS value)
- Add `SOCIAL_WS_ERROR_MESSAGE = "Unable to connect to the social server. Please check that the server is running and try again."`

### Task 2: DemoSocialProxy Retry Logic (TDD)
**File:** `apps/web/src/lib/DemoSocialProxy.ts`
**Tests:** `apps/web/tests/demo-social-proxy.test.ts`

RED tests first:
1. `connect retries on WebSocket error with exponential backoff`
2. `connect calls onError with friendly message after all retries exhausted`
3. `disconnect cancels pending retry timers`
4. `successful connection on retry does not trigger error`

Implementation:
- Add private fields: `retryCount`, `retryTimer`, `pendingWsUrl`, `pendingProfile`
- In `connect()`: store params, reset retryCount, call `attemptConnect()`
- New `attemptConnect()`: creates WebSocket, on error → increment retryCount, if < max schedule retry with `setTimeout(delay)` where delay = baseDelay * 2^retryCount, else call `callbacks.onError(SOCIAL_WS_ERROR_MESSAGE)`
- In `disconnect()`: clear retryTimer via `clearTimeout`, close WS

### Task 3: LobbyScreen Retry Button (TDD)
**File:** `apps/web/src/components/LobbyScreen.tsx`
**Tests:** `apps/web/tests/lobby.test.tsx`

RED tests first:
1. `shows Retry button when error is set and phase is lobby`
2. `Retry button calls onJoin with last profile`
3. `no Retry button when no error`

Implementation:
- In LobbyScreen error block, add a "Retry" button that calls `onJoin` with current form values
- Button has `data-testid="retry-button"`, styled as indigo outline button

### Task 4: Integration Test
**File:** `apps/web/tests/demo-social-proxy.test.ts` (add to existing)

Test: `full flow: connect fails → retries → exhausted → error shown → retry`
- Create proxy, connect with mock WS that always errors
- Advance timers through all retries
- Verify onError called with friendly message
- Verify retryCount via behavior (no more retries after exhaustion)

### Task 5: Lint & Verify
- Run `pnpm lint` and fix issues
- Run `pnpm test` in apps/web, ensure all pass
- Commit and push
