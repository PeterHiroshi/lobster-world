# Deliverable Polish — Implementation Plan

## Overview
Polish Lobster World to deliverable quality: dark mode, responsive mobile, Docker deployment, landing page, enhanced demo, production README.

## Order of Implementation
1. **W16: Dark Mode** — Foundation for all UI work (theme system first)
2. **W15: Responsive Mobile** — Build on themed components
3. **D1: Docker Deployment** — Infrastructure (independent of UI)
4. **D4: Landing Page** — Uses theme + responsive
5. **D2: Enhanced Demo** — Tour overlay on top of existing demo
6. **D3: Production README** — Last, documents everything above

---

## W16: Dark Mode + Theme Toggle

### Tasks
- [ ] W16.1: Add theme slice to zustand store (dark/light, localStorage persist)
- [ ] W16.2: Create ThemeToggle component (sun/moon icon button, top-right)
- [ ] W16.3: Update index.css with CSS variables for dark/light themes
- [ ] W16.4: Apply glass-morphism to all panels (backdrop-blur, semi-transparent bg)
- [ ] W16.5: Update 3D scene lighting/fog/background for dark/light
- [ ] W16.6: Update LobbyScreen with dark/light variants
- [ ] W16.7: Tests for theme toggle and persistence

### Files
- `apps/web/src/store/slices/uiSlice.ts` — add theme state
- `apps/web/src/components/ThemeToggle.tsx` — new
- `apps/web/src/index.css` — CSS variables
- `apps/web/src/components/Scene.tsx` — theme-aware lighting
- `apps/web/src/panels/*` — glass-morphism styles
- `apps/web/src/components/LobbyScreen.tsx` — dark/light

---

## W15: Responsive Mobile Layout + Touch Controls

### Tasks
- [ ] W15.1: Add responsive breakpoint utilities and mobile detection hook
- [ ] W15.2: Make panels into bottom sheet overlays on mobile (<768px)
- [ ] W15.3: Add mobile navigation bar (bottom tabs for panels)
- [ ] W15.4: Make LobbyScreen responsive (stacked fields, full-width)
- [ ] W15.5: Compact BudgetBar and ConnectionStatus on mobile
- [ ] W15.6: Tap lobster = bottom sheet detail card on mobile
- [ ] W15.7: Verify touch controls (OrbitControls already supports pinch/drag)
- [ ] W15.8: Tests for responsive behavior

### Files
- `apps/web/src/hooks/useMediaQuery.ts` — new
- `apps/web/src/components/BottomSheet.tsx` — new
- `apps/web/src/components/MobileNav.tsx` — new
- `apps/web/src/App.tsx` — responsive layout
- `apps/web/src/panels/*` — responsive styles
- `apps/web/src/components/LobbyScreen.tsx` — responsive

---

## D1: Docker Deployment

### Tasks
- [ ] D1.1: Add health check endpoint to server (`GET /health`)
- [ ] D1.2: Add @fastify/static to serve web build from server
- [ ] D1.3: Create `.dockerignore`
- [ ] D1.4: Create multi-stage `Dockerfile`
- [ ] D1.5: Create `docker-compose.yml`
- [ ] D1.6: Test Docker build locally
- [ ] D1.7: Update server config for production env vars

### Files
- `apps/server/src/app.ts` — health endpoint + static serving
- `Dockerfile` — new
- `docker-compose.yml` — new
- `.dockerignore` — new

---

## D4: Landing Page Mode

### Tasks
- [ ] D4.1: Create LandingPage component with hero section
- [ ] D4.2: Add mini R3F canvas with animated lobster
- [ ] D4.3: Create feature cards (Decentralized, Secure, Budget-Controlled)
- [ ] D4.4: Add "Enter the World" and "Watch Demo" CTAs
- [ ] D4.5: Integrate into App.tsx routing (landing → lobby → scene)
- [ ] D4.6: Mobile responsive layout
- [ ] D4.7: Tests

### Files
- `apps/web/src/components/LandingPage.tsx` — new
- `apps/web/src/components/MiniLobster.tsx` — new (simplified lobster for landing)
- `apps/web/src/App.tsx` — add landing phase

---

## D2: Enhanced Demo Experience

### Tasks
- [ ] D2.1: Create DemoTour component with floating step cards
- [ ] D2.2: Define tour steps (4 steps per design)
- [ ] D2.3: Add tour state to store (active step, skip/next)
- [ ] D2.4: Camera pan improvements (spotlight on active lobster)
- [ ] D2.5: Add 2-3 more NPC lobster personalities
- [ ] D2.6: Auto-start demo after lobby join on first visit
- [ ] D2.7: Tests

### Files
- `apps/web/src/components/DemoTour.tsx` — new
- `apps/web/src/store/slices/uiSlice.ts` — tour state
- `apps/web/src/lib/DemoScenario.ts` — enhanced scenario
- `apps/server/src/mock/mock-lobsters.ts` — more NPCs

---

## D3: Production README

### Tasks
- [ ] D3.1: Write hero section with badges
- [ ] D3.2: Quick start (dev + Docker)
- [ ] D3.3: Architecture diagram (mermaid)
- [ ] D3.4: Feature list with checkmarks
- [ ] D3.5: Tech badges, contributing, license

### Files
- `README.md` — rewrite
