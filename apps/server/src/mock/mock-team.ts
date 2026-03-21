import WebSocket from 'ws';
import type {
  PublicProfile,
  UpstreamEvent,
  DownstreamEvent,
  AnimationType,
  MoodType,
  EmoteType,
  Vec3,
  RenderEvent,
  Task,
  TaskPriority,
} from '@lobster-world/protocol';
import {
  PRESET_ROLES,
  ROLE_DESK_POSITIONS,
  MOCK_SCENARIO_TICK_MS,
  MOCK_SCENARIO_INITIAL_DELAY_MS,
} from '@lobster-world/protocol';
import type { WorkforceManager } from '../engine/workforce.js';
import type { TaskEngine, CreateTaskOpts } from '../engine/tasks.js';
import type { CommsEngine } from '../engine/comms.js';
import type { EventProcessor } from '../engine/events.js';
import type { ConnectionManager } from '../ws/connection-manager.js';

// --- Team member definition ---

interface TeamMember {
  profile: PublicProfile;
  roleId: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    profile: {
      id: 'agent-alice',
      name: 'Alice',
      color: '#3B82F6',
      skills: ['product strategy', 'user research', 'roadmap'],
      bio: 'Product Manager who keeps the team focused.',
    },
    roleId: 'pm',
  },
  {
    profile: {
      id: 'agent-bob',
      name: 'Bob',
      color: '#8B5CF6',
      skills: ['system design', 'code review', 'mentoring'],
      bio: 'Tech Lead who architects solutions.',
    },
    roleId: 'tech-lead',
  },
  {
    profile: {
      id: 'agent-carol',
      name: 'Carol',
      color: '#10B981',
      skills: ['node.js', 'databases', 'APIs'],
      bio: 'Backend Dev who builds robust services.',
    },
    roleId: 'backend-dev',
  },
  {
    profile: {
      id: 'agent-dave',
      name: 'Dave',
      color: '#EC4899',
      skills: ['react', 'css', 'accessibility'],
      bio: 'Frontend Dev who crafts great UIs.',
    },
    roleId: 'frontend-dev',
  },
  {
    profile: {
      id: 'agent-eve',
      name: 'Eve',
      color: '#F59E0B',
      skills: ['testing', 'automation', 'bug hunting'],
      bio: 'QA Engineer who finds every edge case.',
    },
    roleId: 'qa',
  },
];

// --- Scenario steps ---

interface ScenarioStep {
  description: string;
  execute: (ctx: ScenarioContext) => void;
}

interface ScenarioContext {
  agents: Map<string, MockTeamAgent>;
  workforce: WorkforceManager;
  tasks: TaskEngine;
  comms: CommsEngine;
  events: EventProcessor;
  connections: ConnectionManager;
  broadcastRender: (event: RenderEvent) => void;
}

function createProjectScenario(): ScenarioStep[] {
  return [
    // Step 1: PM creates tasks
    {
      description: 'PM creates project tasks',
      execute: (ctx) => {
        const taskDefs: Array<{ title: string; desc: string; priority: TaskPriority }> = [
          { title: 'Design API schema', desc: 'Define REST endpoints and data models', priority: 'high' },
          { title: 'Build auth service', desc: 'Implement JWT auth with refresh tokens', priority: 'high' },
          { title: 'Create dashboard UI', desc: 'Build the main dashboard with charts', priority: 'medium' },
          { title: 'Add integration tests', desc: 'Write E2E tests for critical flows', priority: 'medium' },
          { title: 'Setup CI pipeline', desc: 'Configure GitHub Actions for build and test', priority: 'low' },
        ];

        for (const def of taskDefs) {
          const task = ctx.tasks.createTask({
            projectId: 'proj-1',
            title: def.title,
            description: def.desc,
            priority: def.priority,
            createdBy: 'agent-alice',
          });
          ctx.broadcastRender({ type: 'task_update', task });
        }

        ctx.comms.broadcast('agent-alice', 'Created 5 tasks for the new project. Let\'s get started!');
        moveAgent(ctx, 'agent-alice', 'walking', 'Creating project tasks');
        ctx.events.emit('internal', 'tasks_created', { count: 5, by: 'agent-alice' });
      },
    },
    // Step 2: Tech Lead reviews and calls standup
    {
      description: 'Tech Lead calls standup meeting',
      execute: (ctx) => {
        const meeting = ctx.comms.createMeeting('Morning Standup', [
          'agent-alice', 'agent-bob', 'agent-carol', 'agent-dave', 'agent-eve',
        ]);
        ctx.broadcastRender({ type: 'meeting_start', meeting });

        ctx.comms.addMeetingMessage(meeting.id, 'agent-bob', 'Good morning team! Let\'s review the new tasks.');
        ctx.comms.addMeetingMessage(meeting.id, 'agent-alice', 'I\'ve prioritized the API schema and auth service as high priority.');
        ctx.comms.addMeetingMessage(meeting.id, 'agent-bob', 'Carol, can you take the API schema? Dave, start on the dashboard.');

        moveAgent(ctx, 'agent-bob', 'chatting', 'Running standup');
        setAllMood(ctx, 'focused');
      },
    },
    // Step 3: Tech Lead assigns tasks
    {
      description: 'Tech Lead assigns tasks to team',
      execute: (ctx) => {
        const allTasks = ctx.tasks.getAllTasks();
        const assignments: Record<string, string> = {
          'Design API schema': 'agent-carol',
          'Build auth service': 'agent-carol',
          'Create dashboard UI': 'agent-dave',
          'Add integration tests': 'agent-eve',
          'Setup CI pipeline': 'agent-bob',
        };

        for (const task of allTasks) {
          const assignee = assignments[task.title];
          if (assignee) {
            const updated = ctx.tasks.assignTask(task.id, assignee);
            if (updated) {
              ctx.workforce.incrementWorkload(assignee);
              ctx.broadcastRender({
                type: 'task_card_move',
                taskId: task.id,
                fromStatus: 'todo',
                toStatus: 'doing',
                assigneeId: assignee,
              });
              ctx.broadcastRender({ type: 'task_update', task: updated });
            }
          }
        }

        ctx.comms.sendMessage('agent-bob', 'all', 'broadcast', 'Tasks assigned! Let\'s build something great.');
      },
    },
    // Step 4: End standup meeting
    {
      description: 'End standup, devs start working',
      execute: (ctx) => {
        const meetings = ctx.comms.getActiveMeetings();
        if (meetings.length > 0) {
          ctx.comms.addDecision(meetings[0].id, 'Sprint goal: Complete API schema and start auth service');
          ctx.comms.endMeeting(meetings[0].id);
          ctx.broadcastRender({ type: 'meeting_end', meetingId: meetings[0].id });
        }

        moveAgent(ctx, 'agent-carol', 'working', 'Designing API schema');
        moveAgent(ctx, 'agent-dave', 'working', 'Creating dashboard wireframes');
        moveAgent(ctx, 'agent-eve', 'thinking', 'Planning test strategy');
        moveAgent(ctx, 'agent-bob', 'working', 'Setting up CI pipeline');
      },
    },
    // Step 5: Carol finishes API schema, moves to review
    {
      description: 'Backend dev finishes API schema',
      execute: (ctx) => {
        const task = ctx.tasks.getAllTasks().find((t) => t.title === 'Design API schema');
        if (task) {
          const updated = ctx.tasks.transitionStatus(task.id, 'review');
          if (updated) {
            ctx.broadcastRender({
              type: 'task_card_move',
              taskId: task.id,
              fromStatus: 'doing',
              toStatus: 'review',
            });
            ctx.broadcastRender({ type: 'task_update', task: updated });
          }
        }
        ctx.comms.sendMessage('agent-carol', 'agent-bob', 'review', 'API schema ready for review!');
        ctx.events.emit('github', 'pr_created', { title: 'feat: API schema design', author: 'Carol' });
        moveAgent(ctx, 'agent-carol', 'waving', 'API schema done!');
      },
    },
    // Step 6: Bob reviews, sends feedback
    {
      description: 'Tech Lead reviews API schema',
      execute: (ctx) => {
        moveAgent(ctx, 'agent-bob', 'thinking', 'Reviewing API schema PR');
        ctx.comms.sendMessage('agent-bob', 'agent-carol', 'review', 'Looks good! Just add pagination to the list endpoints.');
        ctx.events.emit('github', 'pr_review', { title: 'feat: API schema', reviewer: 'Bob', status: 'approved' });
      },
    },
    // Step 7: API schema done, Dave makes progress
    {
      description: 'API schema approved, dashboard progressing',
      execute: (ctx) => {
        const apiTask = ctx.tasks.getAllTasks().find((t) => t.title === 'Design API schema');
        if (apiTask) {
          const updated = ctx.tasks.transitionStatus(apiTask.id, 'done');
          if (updated) {
            ctx.workforce.decrementWorkload('agent-carol');
            ctx.broadcastRender({
              type: 'task_card_move',
              taskId: apiTask.id,
              fromStatus: 'review',
              toStatus: 'done',
            });
            ctx.broadcastRender({ type: 'task_update', task: updated });
            ctx.broadcastRender({
              type: 'effect',
              position: { x: 0, y: 2, z: -8 },
              effectType: 'confetti',
            });
          }
        }
        moveAgent(ctx, 'agent-carol', 'working', 'Starting auth service');
        moveAgent(ctx, 'agent-dave', 'working', 'Building chart components');
        ctx.comms.sendMessage('agent-dave', 'agent-carol', 'direct', 'Hey Carol, what format should the API responses be?');
        ctx.comms.sendMessage('agent-carol', 'agent-dave', 'direct', 'JSON with camelCase keys. I\'ll share the schema doc.');
      },
    },
    // Step 8: CI pipeline done, eve starts testing
    {
      description: 'CI pipeline complete, QA begins testing',
      execute: (ctx) => {
        const ciTask = ctx.tasks.getAllTasks().find((t) => t.title === 'Setup CI pipeline');
        if (ciTask) {
          const reviewed = ctx.tasks.transitionStatus(ciTask.id, 'review');
          if (reviewed) {
            ctx.broadcastRender({ type: 'task_card_move', taskId: ciTask.id, fromStatus: 'doing', toStatus: 'review' });
            const done = ctx.tasks.transitionStatus(ciTask.id, 'done');
            if (done) {
              ctx.workforce.decrementWorkload('agent-bob');
              ctx.broadcastRender({ type: 'task_card_move', taskId: ciTask.id, fromStatus: 'review', toStatus: 'done' });
              ctx.broadcastRender({ type: 'task_update', task: done });
            }
          }
        }
        ctx.events.emit('github', 'deploy_success', { service: 'CI Pipeline', version: '1.0.0' });
        moveAgent(ctx, 'agent-bob', 'celebrating', 'CI pipeline is live!');
        moveAgent(ctx, 'agent-eve', 'working', 'Writing integration tests');
      },
    },
    // Step 9: New issue comes in
    {
      description: 'External event: new bug report',
      execute: (ctx) => {
        ctx.events.emit('github', 'new_issue', { title: 'Login fails on Safari', priority: 'urgent' });
        const bugTask = ctx.tasks.createTask({
          projectId: 'proj-1',
          title: 'Fix Safari login bug',
          description: 'Users report login failing on Safari 17',
          priority: 'urgent',
          createdBy: 'agent-alice',
        });
        ctx.broadcastRender({ type: 'task_update', task: bugTask });
        ctx.comms.broadcast('agent-alice', 'Urgent bug: Login fails on Safari. Eve, can you reproduce?');
        moveAgent(ctx, 'agent-alice', 'thinking', 'Triaging urgent bug');
      },
    },
    // Step 10: Eve investigates bug
    {
      description: 'QA investigates Safari bug',
      execute: (ctx) => {
        const bugTask = ctx.tasks.getAllTasks().find((t) => t.title === 'Fix Safari login bug');
        if (bugTask) {
          const assigned = ctx.tasks.assignTask(bugTask.id, 'agent-eve');
          if (assigned) {
            ctx.workforce.incrementWorkload('agent-eve');
            ctx.broadcastRender({ type: 'task_card_move', taskId: bugTask.id, fromStatus: 'todo', toStatus: 'doing', assigneeId: 'agent-eve' });
            ctx.broadcastRender({ type: 'task_update', task: assigned });
          }
        }
        ctx.comms.sendMessage('agent-eve', 'agent-carol', 'direct', 'Reproduced the Safari bug. It\'s a cookie SameSite issue.');
        moveAgent(ctx, 'agent-eve', 'working', 'Debugging Safari login');
      },
    },
    // Step 11: Dashboard to review, auth progressing
    {
      description: 'Dashboard ready for review',
      execute: (ctx) => {
        const dashTask = ctx.tasks.getAllTasks().find((t) => t.title === 'Create dashboard UI');
        if (dashTask) {
          const updated = ctx.tasks.transitionStatus(dashTask.id, 'review');
          if (updated) {
            ctx.broadcastRender({ type: 'task_card_move', taskId: dashTask.id, fromStatus: 'doing', toStatus: 'review' });
            ctx.broadcastRender({ type: 'task_update', task: updated });
          }
        }
        ctx.events.emit('github', 'pr_created', { title: 'feat: Dashboard UI', author: 'Dave' });
        ctx.comms.sendMessage('agent-dave', 'agent-bob', 'review', 'Dashboard PR is up for review!');
        moveAgent(ctx, 'agent-dave', 'waving', 'Dashboard ready for review!');
        moveAgent(ctx, 'agent-carol', 'working', 'Implementing JWT refresh logic');
      },
    },
    // Step 12: Bug fixed, celebration
    {
      description: 'Safari bug fixed and deployed',
      execute: (ctx) => {
        const bugTask = ctx.tasks.getAllTasks().find((t) => t.title === 'Fix Safari login bug');
        if (bugTask) {
          const reviewed = ctx.tasks.transitionStatus(bugTask.id, 'review');
          if (reviewed) {
            ctx.broadcastRender({ type: 'task_card_move', taskId: bugTask.id, fromStatus: 'doing', toStatus: 'review' });
            const done = ctx.tasks.transitionStatus(bugTask.id, 'done');
            if (done) {
              ctx.workforce.decrementWorkload('agent-eve');
              ctx.broadcastRender({ type: 'task_card_move', taskId: bugTask.id, fromStatus: 'review', toStatus: 'done' });
              ctx.broadcastRender({ type: 'task_update', task: done });
              ctx.broadcastRender({ type: 'effect', position: { x: 3, y: 1, z: 0 }, effectType: 'confetti' });
            }
          }
        }
        ctx.events.emit('github', 'deploy_success', { service: 'hotfix/safari-login', version: '1.0.1' });
        ctx.comms.broadcast('agent-eve', 'Safari bug is fixed and deployed!');
        setAllMood(ctx, 'happy');
      },
    },
    // Step 13: Dashboard approved
    {
      description: 'Dashboard approved, moving to done',
      execute: (ctx) => {
        const dashTask = ctx.tasks.getAllTasks().find((t) => t.title === 'Create dashboard UI');
        if (dashTask && dashTask.status === 'review') {
          const done = ctx.tasks.transitionStatus(dashTask.id, 'done');
          if (done) {
            ctx.workforce.decrementWorkload('agent-dave');
            ctx.broadcastRender({ type: 'task_card_move', taskId: dashTask.id, fromStatus: 'review', toStatus: 'done' });
            ctx.broadcastRender({ type: 'task_update', task: done });
          }
        }
        moveAgent(ctx, 'agent-dave', 'celebrating', 'Dashboard shipped!');
        ctx.comms.sendMessage('agent-bob', 'agent-dave', 'direct', 'Great work on the dashboard!');
      },
    },
    // Step 14: Auth service to review
    {
      description: 'Auth service ready for review',
      execute: (ctx) => {
        const authTask = ctx.tasks.getAllTasks().find((t) => t.title === 'Build auth service');
        if (authTask) {
          const updated = ctx.tasks.transitionStatus(authTask.id, 'review');
          if (updated) {
            ctx.broadcastRender({ type: 'task_card_move', taskId: authTask.id, fromStatus: 'doing', toStatus: 'review' });
            ctx.broadcastRender({ type: 'task_update', task: updated });
          }
        }
        ctx.events.emit('github', 'pr_created', { title: 'feat: Auth service with JWT', author: 'Carol' });
        moveAgent(ctx, 'agent-carol', 'chatting', 'Walking Bob through auth design');
      },
    },
    // Step 15: Integration tests finishing up
    {
      description: 'Integration tests complete, sprint wrapping up',
      execute: (ctx) => {
        const testTask = ctx.tasks.getAllTasks().find((t) => t.title === 'Add integration tests');
        if (testTask) {
          const reviewed = ctx.tasks.transitionStatus(testTask.id, 'review');
          if (reviewed) {
            ctx.broadcastRender({ type: 'task_card_move', taskId: testTask.id, fromStatus: 'doing', toStatus: 'review' });
            const done = ctx.tasks.transitionStatus(testTask.id, 'done');
            if (done) {
              ctx.workforce.decrementWorkload('agent-eve');
              ctx.broadcastRender({ type: 'task_card_move', taskId: testTask.id, fromStatus: 'review', toStatus: 'done' });
              ctx.broadcastRender({ type: 'task_update', task: done });
            }
          }
        }

        // Auth also done
        const authTask = ctx.tasks.getAllTasks().find((t) => t.title === 'Build auth service');
        if (authTask && authTask.status === 'review') {
          const done = ctx.tasks.transitionStatus(authTask.id, 'done');
          if (done) {
            ctx.workforce.decrementWorkload('agent-carol');
            ctx.broadcastRender({ type: 'task_card_move', taskId: authTask.id, fromStatus: 'review', toStatus: 'done' });
            ctx.broadcastRender({ type: 'task_update', task: done });
          }
        }

        ctx.comms.broadcast('agent-alice', 'All sprint tasks complete! Great work team!');
        setAllMood(ctx, 'excited');
        ctx.broadcastRender({ type: 'effect', position: { x: 0, y: 2, z: 0 }, effectType: 'confetti' });
      },
    },
  ];
}

// --- Helper functions ---

function moveAgent(ctx: ScenarioContext, agentId: string, animation: AnimationType, activity: string): void {
  const agent = ctx.agents.get(agentId);
  if (!agent) return;

  agent.sendUpstream({
    type: 'state_update',
    state: { animation },
  });
  agent.sendUpstream({
    type: 'activity_update',
    activity,
  });
}

function setAllMood(ctx: ScenarioContext, mood: MoodType): void {
  for (const agent of ctx.agents.values()) {
    agent.sendUpstream({
      type: 'state_update',
      state: { mood },
    });
  }
}

// --- Mock Team Agent (simplified WS client) ---

class MockTeamAgent {
  private ws: WebSocket | null = null;
  private lobsterId: string | null = null;

  constructor(
    readonly profile: PublicProfile,
    readonly roleId: string,
    private readonly serverUrl: string,
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.serverUrl}/ws/lobster`;
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.sendUpstream({
          type: 'register',
          profile: this.profile,
          token: `team-token-${this.profile.id}`,
        });
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        const event = JSON.parse(data.toString()) as DownstreamEvent;
        if (event.type === 'registered') {
          this.lobsterId = event.lobsterId;
          resolve();
        }
      });

      this.ws.on('error', (err: Error) => {
        console.error(`[TeamAgent:${this.profile.name}] Error:`, err.message);
        reject(err);
      });
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getLobsterId(): string | null {
    return this.lobsterId;
  }

  sendUpstream(event: UpstreamEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }
}

// --- Scenario Runner ---

export class TeamScenarioRunner {
  private agents: Map<string, MockTeamAgent> = new Map();
  private scenarioTimer: ReturnType<typeof setTimeout> | null = null;
  private currentStep = 0;
  private scenario: ScenarioStep[] = [];

  constructor(
    private readonly serverUrl: string,
    private readonly workforce: WorkforceManager,
    private readonly tasks: TaskEngine,
    private readonly comms: CommsEngine,
    private readonly events: EventProcessor,
    private readonly connections: ConnectionManager,
  ) {}

  async start(): Promise<void> {
    // Connect all team agents
    for (const member of TEAM_MEMBERS) {
      const agent = new MockTeamAgent(member.profile, member.roleId, this.serverUrl);
      this.agents.set(member.profile.id, agent);
    }

    // Stagger connections
    for (const [id, agent] of this.agents) {
      await agent.connect();
      const member = TEAM_MEMBERS.find((m) => m.profile.id === id);
      if (member) {
        this.workforce.registerAgent(id, member.roleId);

        // Position agent at their desk
        const deskPos = ROLE_DESK_POSITIONS[member.roleId] ?? { x: 0, z: 0 };
        agent.sendUpstream({
          type: 'state_update',
          state: {
            position: { x: deskPos.x, y: 0, z: deskPos.z },
            animation: 'idle',
          },
        });
      }
    }

    // Broadcast team sync
    const teamData = TEAM_MEMBERS.map((m) => {
      const role = PRESET_ROLES.find((r) => r.id === m.roleId);
      return {
        id: m.profile.id,
        roleId: m.roleId,
        name: m.profile.name,
        color: role?.color ?? m.profile.color,
      };
    });
    this.broadcastRender({ type: 'team_sync', agents: teamData });

    // Start scenario after delay
    this.scenario = createProjectScenario();
    this.currentStep = 0;

    this.scenarioTimer = setTimeout(() => {
      this.runNextStep();
    }, MOCK_SCENARIO_INITIAL_DELAY_MS);
  }

  stop(): void {
    if (this.scenarioTimer !== null) {
      clearTimeout(this.scenarioTimer);
      this.scenarioTimer = null;
    }
    for (const agent of this.agents.values()) {
      agent.disconnect();
    }
    this.agents.clear();
  }

  private runNextStep(): void {
    if (this.currentStep >= this.scenario.length) {
      // Loop the scenario
      this.currentStep = 0;
      // Reset tasks for next cycle
      console.log('[TeamScenario] Scenario complete. Restarting...');
    }

    const step = this.scenario[this.currentStep];
    console.log(`[TeamScenario] Step ${this.currentStep + 1}: ${step.description}`);

    const ctx: ScenarioContext = {
      agents: this.agents,
      workforce: this.workforce,
      tasks: this.tasks,
      comms: this.comms,
      events: this.events,
      connections: this.connections,
      broadcastRender: (event) => this.broadcastRender(event),
    };

    step.execute(ctx);
    this.currentStep++;

    this.scenarioTimer = setTimeout(() => {
      this.runNextStep();
    }, MOCK_SCENARIO_TICK_MS);
  }

  private broadcastRender(event: RenderEvent): void {
    this.connections.broadcastToViewers(event);
  }
}

// --- Public entry point ---

export function startTeamScenario(
  serverUrl: string,
  workforce: WorkforceManager,
  tasks: TaskEngine,
  comms: CommsEngine,
  events: EventProcessor,
  connections: ConnectionManager,
): TeamScenarioRunner {
  const runner = new TeamScenarioRunner(
    serverUrl,
    workforce,
    tasks,
    comms,
    events,
    connections,
  );

  runner.start().catch((err) => {
    console.error('[TeamScenario] Failed to start:', err);
  });

  return runner;
}
