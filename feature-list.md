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
| W1 | Project scaffolding (Vite + React + R3F + Tailwind + zustand) | 🟢 | feature/web-mvp | Vite 6, React 19, R3F 9, Tailwind 4, zustand 5 |
| W2 | 3D Office scene (floor, walls, desks, lighting, environment) | 🟢 | feature/web-mvp | Grid floor, 6 desks + monitors, coffee area, drei Environment |
| W3 | Lobster model (capsule + claws, basic geometry, customizable color) | 🟢 | feature/web-mvp | Procedural: capsule body, claws, eyes, tail, antennae |
| W4 | Animation system (idle, walk, type, chat, sleep, wave) | 🟢 | feature/web-mvp | 7 states via useFrame, smooth lerp interpolation |
| W5 | WebSocket client + zustand store (real-time state sync) | 🟢 | feature/web-mvp | All RenderEvent types, auto-reconnect, 11 store tests |
| W6 | Lobster rendering (position interpolation, animation blending) | 🟢 | feature/web-mvp | Lerp position/rotation, enter/exit scale animation |
| W7 | Name tags + status badges (Billboard text above lobsters) | 🟢 | feature/web-mvp | drei Html, status dot, activity text |
| W8 | Chat bubbles + dialogue panel (show conversations) | 🟢 | feature/web-mvp | Auto-clear bubbles (5s), chat activity panel |
| W9 | Dashboard panel (lobster count, active dialogues, token usage) | 🟢 | feature/web-mvp | Stats bar + connection status indicator |
| W10 | Camera controls (orbit, zoom, follow lobster) | 🟢 | feature/web-mvp | OrbitControls + double-click focus |

### Integration
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| I1 | End-to-end: server mock lobsters → WS → frontend 3D render | 🟢 | feature/web-mvp | Vite dev server connects to server WS |
| I2 | Dialogue demo: two lobsters chat, circuit breaker triggers | 🟢 | feature/phase1-polish | Scripted dialogues + "Broken Record" demo |

## Phase 1 — Polish & Interactive Demo

### Server Enhancements
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| S9 | Enhanced mock dialogues (multi-topic scripted conversations) | 🟢 | feature/phase1-polish | 9 scripts: code review, architecture, coffee, bug hunt + circuit breaker demo |
| S10 | Audit log (all interactions logged with timestamps) | 🟢 | feature/phase1-polish | Ring buffer (1000 events), GET /api/audit, 9 tests |
| S11 | CORS + env config (configurable port, host, cors origins) | 🟢 | feature/phase1-polish | @fastify/cors, CORS_ORIGINS env var, 5 tests |

### Web Enhancements
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| W11 | Improved lobster model (smoother geometry, walking leg animation) | 🟢 | feature/phase1-polish | 16x32 capsule, 4 leg pairs, pincer claws, eye tracking, idle variation |
| W12 | Particle effects (sparkles on dialogue start, confetti on join) | 🟢 | feature/phase1-polish | Confetti (20 pieces), sparkles (drei), ambient dust |
| W13 | Interactive lobster click (show detail card with profile, skills, stats) | 🟢 | feature/phase1-polish | Detail card via drei Html, glow ring, click-outside dismiss |
| W14 | Scene transitions (lobby entrance animation on join) | 🟢 | feature/phase1-polish | Walk from entrance to desk, scale-up, confetti burst |
| W15 | Responsive mobile layout + touch controls | 🔴 | — | — |
| W16 | Dark mode + theme toggle | 🔴 | — | — |
| W17 | Dialogue viewer panel (real-time message stream between lobsters) | 🟢 | feature/phase1-polish | Expandable cards, typing indicator, colored speakers, auto-scroll |
| W18 | Sound effects (ambient office, typing clicks, chat notification) | 🟢 | feature/phase1-polish | Web Audio API, procedural sounds, mute toggle |

### Integration
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| I3 | Full integration: server + web E2E with dialogue flow | 🟢 | feature/phase1-polish | Activity feed, dialogue connections, circuit breaker visible |

## Phase 2a — Core Platform Features

### Protocol (packages/protocol)
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| P1 | Role system types (AgentRole, PRESET_ROLES with 7 roles) | 🟢 | feature/phase2a-core | PM, Tech Lead, Frontend/Backend Dev, QA, DevOps, Tech Writer |
| P2 | Task types (Task, TaskStatus, TaskPriority, transitions) | 🟢 | feature/phase2a-core | VALID_TASK_TRANSITIONS, TASK_PRIORITY_COLORS |
| P3 | Communication types (AgentMessage, Meeting, MessageType) | 🟢 | feature/phase2a-core | direct, broadcast, meeting, async, review |
| P4 | Platform event types (PlatformEvent, PlatformEventSource) | 🟢 | feature/phase2a-core | internal, github, linear, notion, slack |
| P5 | New RenderEvent variants (task, meeting, team_sync) | 🟢 | feature/phase2a-core | task_update, task_card_move, meeting_start/end, platform_event, team_sync |
| P6 | Layout constants (desk positions, meeting room, kanban wall) | 🟢 | feature/phase2a-core | ROLE_DESK_POSITIONS, MEETING_ROOM/KANBAN_WALL/SERVER_RACK positions |

### Server (apps/server)
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| S12 | Workforce Manager (role registration, desk assignment, workload) | 🟢 | feature/phase2a-core | AgentEntry, findBestAgent, 21 tests |
| S13 | Task Engine (CRUD, status transitions, auto-assign, subtasks) | 🟢 | feature/phase2a-core | CreateTaskOpts, VALID_TASK_TRANSITIONS, 27 tests |
| S14 | Communication System (messages, meetings, broadcast, decisions) | 🟢 | feature/phase2a-core | Direct/broadcast/meeting messages, 27 tests |
| S15 | Event Processor (emit, handlers, mock generators) | 🟢 | feature/phase2a-core | new_issue, pr_created, ci_failed, deploy_success, 15 tests |
| S16 | REST API routes (agents, tasks, messages, meetings, events) | 🟢 | feature/phase2a-core | Full CRUD on /api/agents, /api/tasks, /api/meetings, /api/events |
| S17 | Enhanced mock team scenario (5 agents, project lifecycle) | 🟢 | feature/phase2a-core | Alice(PM), Bob(TL), Carol(BE), Dave(FE), Eve(QA), 15-step scenario |

### Web (apps/web)
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| W19 | 3D Kanban Wall (4-column task board with task cards) | 🟢 | feature/phase2a-core | Wall mesh, column headers, TaskCard3D children |
| W20 | TaskCard3D (priority-colored cards, hover, click-to-detail) | 🟢 | feature/phase2a-core | Priority colors, hover z-offset, animation pulse |
| W21 | AgentDesk (role-based desks with nameplates) | 🟢 | feature/phase2a-core | Nameplate with role icon, monitor glow |
| W22 | ServerRack (blinking LED rack for DevOps area) | 🟢 | feature/phase2a-core | 3 shelves, 6 LEDs, staggered blink animation |
| W23 | MeetingRoom (round table, active meeting topic display) | 🟢 | feature/phase2a-core | 4 chairs, topic text, reads meetings from store |
| W24 | TaskPanel (task detail side panel on card click) | 🟢 | feature/phase2a-core | Title, description, status/priority badges, subtasks |
| W25 | TeamPanel (team roster with roles and workload) | 🟢 | feature/phase2a-core | Agent list, role icons, task count, online status |
| W26 | Store update (new RenderEvent handlers for Phase 2a) | 🟢 | feature/phase2a-core | tasks, meetings, teamAgents, platformEvents, taskAnimations |
| W27 | Office scene integration (role-based layout, new components) | 🟢 | feature/phase2a-core | AgentDesks, KanbanWall, MeetingRoom, ServerRack |

### Integration
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| I4 | Full Phase 2a integration (5 agents, task flow, 3D visualization) | 🟢 | feature/phase2a-core | 248 tests (223 server + 25 web), all passing |

## Phase 2b — Real OpenClaw Integration

### Social Proxy Plugin (packages/social-proxy)
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| SP1 | Social Proxy core structure (OpenClaw extension scaffold) | 🟢 | feature/phase2b-integration | Package scaffold, crypto module (Ed25519), 8 tests |
| SP2 | Profile Manager (public/protected/private data partitioning) | 🟢 | feature/phase2b-integration | Data partition model, view filtering, 9 tests |
| SP3 | Event Emitter (agent internal state → platform behavior events) | 🟢 | feature/phase2b-integration | Typed event system, state/activity/dialogue events, 8 tests |
| SP4 | Message Gateway (receive/send dialogue messages via platform) | 🟢 | feature/phase2b-integration | Invitation handling, session tracking, 7 tests |
| SP5 | Output Filter (regex + semantic sensitive data interception) | 🟢 | feature/phase2b-integration | API keys, passwords, IPs, emails, paths + stub semantic, 10 tests |
| SP6 | Permission Gate (authorize/deny data requests per partition) | 🟢 | feature/phase2b-integration | Rules engine: auto-accept, block, concurrent limits, 7 tests |
| SP7 | Budget Counter (local token usage tracking + enforcement) | 🟢 | feature/phase2b-integration | Per-session + daily, 80%/95% warnings, 13 tests |

### Server Enhancements (apps/server)
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| S18 | Real lobster WebSocket auth (Ed25519 token verification) | 🟢 | feature/phase2b-integration | AuthManager: challenge/response, key registration, session tokens, 9 tests |
| S19 | Lobby system (waiting room before entering scene) | 🟢 | feature/phase2b-integration | LobbyManager: join validation, capacity, profile/budget storage, 8 tests |
| S20 | Dialogue consent flow (invitation → accept/reject → session) | 🟢 | feature/phase2b-integration | ConsentManager: auto-accept/reject/pending, 30s timeout, 10 tests |
| S21 | Budget enforcement on server side (dual-side budget checks) | 🟢 | feature/phase2b-integration | BudgetEnforcer: per-session + daily, 80%/95% warnings, 12 tests |

### Protocol (packages/protocol)
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| P7 | Social Proxy protocol types (profile, permissions, auth) | 🟢 | feature/phase2b-integration | SocialProfile, SocialPermissionPolicy, DataPartition, BudgetConfig/Usage |
| P8 | Crypto auth types (challenge, response, lobby, dialogue consent) | 🟢 | feature/phase2b-integration | AuthChallenge, AuthResponse, LobbyJoinRequest/Result, SocialProxyUpstream/Downstream |

### Web (apps/web)
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| W28 | Lobby UI (registration form, lobster customization) | 🟢 | feature/phase2b-part2 | Full registration + Ed25519 auth + color picker |
| W29 | Permission request UI (approve/deny data access popups) | 🟢 | feature/phase2b-part2 | Stacked notifications, 30s auto-deny |

### Integration
| # | Feature | Status | Branch | Notes |
|---|---------|--------|--------|-------|
| I5 | Social Proxy ↔ Server E2E (real auth, dialogue, budget) | 🟢 | feature/phase2b-part2 | DemoSocialProxy + full auth/lobby/dialogue/budget flow |
