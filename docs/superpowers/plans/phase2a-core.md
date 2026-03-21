# Phase 2a: Core Platform Features — Implementation Plan

## Overview
Transform Lobster World from a demo into a real Agent Virtual Office platform with workforce management, task engine, role system, agent communication, and enhanced 3D visualization.

## Task Breakdown

### Task 1: Protocol Types Update (packages/protocol)
**Files:** `packages/protocol/src/index.ts`

Add new types:
- `AgentRole` interface (id, name, icon, color, responsibilities, behaviorWeights)
- `PRESET_ROLES` constant array (pm, tech-lead, frontend-dev, backend-dev, qa, devops, tech-writer)
- `TaskStatus`, `TaskPriority` types
- `Task` interface (id, projectId, title, description, status, priority, assigneeId, createdBy, subtasks, timestamps)
- `MessageType` union ("direct" | "broadcast" | "meeting" | "async" | "review")
- `AgentMessage` interface (id, from, to, type, context, content, timestamp)
- `Meeting` interface (id, topic, participants, messages, decisions, status)
- `PlatformEvent` interface (id, source, type, data, timestamp, processedBy)
- New `RenderEvent` variants: `task_update`, `task_card_move`, `meeting_start`, `meeting_end`, `platform_event`, `team_sync`
- New `UpstreamEvent` variants for task/message operations (future)
- Constants: `MAX_TASKS_PER_PROJECT`, `TASK_CARD_COLORS`, `ROLE_DESK_POSITIONS`

**Tests:** Protocol types are structural (TypeScript compile-time checked). No runtime tests needed.

### Task 2: Workforce Manager (apps/server)
**Files:** `apps/server/src/engine/workforce.ts`, `apps/server/tests/workforce.test.ts`

Class `WorkforceManager`:
- `registerAgent(agentId, role: AgentRole)` — assign role, track in roster
- `unregisterAgent(agentId)` — remove from roster
- `getAgent(agentId)` — get agent info + role
- `getAllAgents()` — full roster
- `getAgentsByRole(roleId)` — filter by role
- `assignDesk(agentId, roleId)` — deterministic desk position based on role
- `getWorkload(agentId)` — current task count
- `incrementWorkload(agentId)` / `decrementWorkload(agentId)`
- `findBestAgent(roleId)` — agent with role + lowest workload

**Tests (TDD, ~20):**
- Register/unregister agents
- Get agent by ID / role
- Desk assignment by role
- Workload tracking
- Find best agent (least loaded)
- Edge cases: unregistering non-existent, finding agent when none available

### Task 3: Task Engine (apps/server)
**Files:** `apps/server/src/engine/tasks.ts`, `apps/server/tests/tasks.test.ts`

Class `TaskEngine`:
- `createTask(opts)` — create with id, defaults to "todo" status
- `getTask(id)` — get by ID
- `getAllTasks()` / `getTasksByProject(projectId)` / `getTasksByAssignee(assigneeId)`
- `getTasksByStatus(status)` — filter
- `updateTask(id, partial)` — update fields
- `transitionStatus(id, newStatus)` — validate transitions (todo->doing->review->done, back allowed)
- `assignTask(taskId, agentId)` — assign + auto-transition to "doing"
- `createSubtask(parentId, opts)` — create subtask linked to parent
- `deleteTask(id)` — remove

Valid transitions: todo<->doing, doing<->review, review<->done, todo->done (skip)

**Tests (TDD, ~25):**
- CRUD operations
- Status transitions (valid + invalid)
- Auto-assign flow
- Subtask creation
- Filter by status/project/assignee
- Edge cases

### Task 4: Communication System (apps/server)
**Files:** `apps/server/src/engine/comms.ts`, `apps/server/tests/comms.test.ts`

Class `CommsEngine`:
- `sendMessage(msg: AgentMessage)` — store + return
- `getMessages(agentId)` — messages for agent
- `getMessagesByType(type)` — filter
- `createMeeting(topic, participants)` — create meeting session
- `addMeetingMessage(meetingId, msg)` — add message to meeting
- `addDecision(meetingId, decision)` — record decision
- `endMeeting(meetingId)` — close meeting
- `getMeeting(id)` — get meeting
- `getActiveMeetings()` — list active meetings
- `broadcast(fromId, content)` — create broadcast message to all

**Tests (TDD, ~20):**
- Send/receive direct messages
- Broadcast messages
- Meeting lifecycle (create, messages, decisions, end)
- Filter by type
- Edge cases

### Task 5: Event Processor (apps/server)
**Files:** `apps/server/src/engine/events.ts`, `apps/server/tests/events.test.ts`

Class `EventProcessor`:
- `emit(event: PlatformEvent)` — process + store
- `getRecent(count)` — recent events
- `onEvent(handler)` — register handler callback
- `processEvent(event)` — route to appropriate handler
- Mock event generators for: new_issue, pr_created, ci_failed, deploy_success

**Tests (TDD, ~15):**
- Emit and retrieve events
- Handler registration + callback
- Mock event generation
- Event routing

### Task 6: REST API Routes (apps/server)
**Files:** `apps/server/src/api/routes.ts` (extend existing)

New endpoints:
- `GET /api/agents` — all agents with roles
- `GET /api/agents/:id` — single agent details
- `POST /api/agents` — register agent with role (body: { agentId, roleId })
- `GET /api/tasks` — all tasks (query: ?status=, ?assignee=, ?project=)
- `GET /api/tasks/:id` — single task
- `POST /api/tasks` — create task
- `PUT /api/tasks/:id` — update task
- `POST /api/tasks/:id/transition` — status transition (body: { status })
- `POST /api/messages` — send message
- `GET /api/meetings` — active meetings
- `GET /api/meetings/:id` — meeting details
- `POST /api/meetings` — create meeting
- `GET /api/events` — recent platform events

Wire new engines into index.ts.

### Task 7: Enhanced Mock Scenario (apps/server)
**Files:** `apps/server/src/mock/mock-team.ts` (new), update `apps/server/src/mock/mock-lobsters.ts`

Replace 3 simple lobsters with 5-agent team:
- PM (Alice): creates tasks, calls meetings
- Tech Lead (Bob): reviews tasks, assigns work, calls standups
- Backend Dev (Carol): picks up backend tasks, codes
- Frontend Dev (Dave): picks up frontend tasks, codes
- QA (Eve): tests completed features, reports bugs

Simulate project lifecycle:
1. PM creates tasks on board (via task engine)
2. Tech Lead assigns tasks
3. Devs pick up and work
4. QA reviews
5. Tasks flow across board

Each agent follows role behaviorWeights. Use timers to drive the scenario.

### Task 8: New RenderEvents + Store Update (apps/web)
**Files:** `packages/protocol/src/index.ts` (already done in T1), `apps/web/src/store/useWorldStore.ts`

Add store handling for:
- `task_update` — update task board state
- `task_card_move` — animate card movement
- `meeting_start` / `meeting_end` — track active meetings
- `platform_event` — show in activity feed
- `team_sync` — full team roster

New store slices: `tasks`, `meetings`, `teamRoster`

### Task 9: 3D KanbanWall + TaskCard3D (apps/web)
**Files:** `apps/web/src/components/KanbanWall.tsx`, `apps/web/src/components/TaskCard3D.tsx`

KanbanWall:
- Physical wall mesh at back of office
- 4 column headers: Todo, Doing, Review, Done
- Render TaskCard3D children in each column

TaskCard3D:
- Small 3D rectangle colored by priority (low=green, medium=blue, high=orange, urgent=red)
- Text label (task title, truncated)
- Click handler -> open TaskPanel
- Animated transitions when status changes

### Task 10: AgentDesk + ServerRack + MeetingRoom (apps/web)
**Files:** `apps/web/src/components/AgentDesk.tsx`, `apps/web/src/components/ServerRack.tsx`, `apps/web/src/components/MeetingRoom.tsx`

AgentDesk:
- Desk with nameplate (agent name + role icon via drei Text)
- Positioned based on role (PM/TL near kanban wall, devs in rows, QA near testing area, DevOps near rack)
- Replace static DESK_POSITIONS with role-based layout

ServerRack:
- Small 3D rack with blinking LED lights (useFrame animation)
- Positioned in DevOps area

MeetingRoom:
- Circular table in a designated area
- When meeting active: show topic text above table
- Agents gather around table during meetings

### Task 11: TaskPanel + TeamPanel (apps/web)
**Files:** `apps/web/src/panels/TaskPanel.tsx`, `apps/web/src/panels/TeamPanel.tsx`

TaskPanel:
- Side panel showing task details (title, description, status, priority, assignee)
- Status badge, priority color
- Subtask list
- Opens on TaskCard3D click

TeamPanel:
- Team overview: list of agents with role, status, current task
- Workload indicators
- Grouped by role

### Task 12: Update Office.tsx + Scene.tsx (apps/web)
**Files:** `apps/web/src/components/Office.tsx`, `apps/web/src/components/Scene.tsx`

Office.tsx:
- Replace static desks with AgentDesk components from store
- Add KanbanWall at back wall
- Add MeetingRoom area
- Add ServerRack in DevOps corner
- Adjust layout constants

Scene.tsx:
- Add new panels (TaskPanel, TeamPanel) to overlay
- Wire up task click handlers

### Task 13: Integration + Lint + Test
- Run all existing server tests (regression)
- Run all new engine tests
- Run web component tests
- Run `pnpm lint` and fix errors
- Manual verification of the full flow

### Task 14: Feature List + Progress + Commit
- Update feature-list.md with Phase 2a entries
- Update progress.md
- Final commit + push

## Execution Order
1. T1 (protocol) — foundation for everything
2. T2 (workforce) + T3 (tasks) + T4 (comms) + T5 (events) — parallel server engines, TDD
3. T6 (API routes) — depends on T2-T5
4. T7 (mock scenario) — depends on T2-T5
5. T8 (store update) — depends on T1
6. T9 (kanban) + T10 (desk/rack/meeting) + T11 (panels) — parallel 3D components
7. T12 (scene integration) — depends on T9-T11
8. T13 (test + lint)
9. T14 (docs + push)

## Dependencies
```
T1 → T2, T3, T4, T5 (all need protocol types)
T2+T3+T4+T5 → T6 (API needs engines)
T2+T3+T4+T5 → T7 (mock needs engines)
T1 → T8 (store needs new RenderEvents)
T8 → T9, T10, T11 (components need store)
T9+T10+T11 → T12 (scene integration)
All → T13 → T14
```
