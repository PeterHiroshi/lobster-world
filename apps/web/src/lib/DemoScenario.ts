import { useWorldStore } from '../store/useWorldStore';
import type { PermissionRequest, BudgetStatus, LobsterState } from '@lobster-world/protocol';
import { DEMO_NPC_DELAY_MS } from '@lobster-world/protocol';

const NPCS: { id: string; name: string; color: string; role: string }[] = [
  { id: 'cody-npc', name: 'Cody', color: '#ff6b6b', role: 'Senior Developer' },
  { id: 'suki-npc', name: 'Suki', color: '#4ade80', role: 'UX Designer' },
  { id: 'phil-npc', name: 'Phil', color: '#f59e0b', role: 'DevOps Engineer' },
  { id: 'luna-npc', name: 'Luna', color: '#a78bfa', role: 'Data Scientist' },
  { id: 'rex-npc', name: 'Rex', color: '#fb923c', role: 'QA Lead' },
];

let demoTimer: ReturnType<typeof setTimeout> | null = null;
let sequenceTimers: ReturnType<typeof setTimeout>[] = [];

function schedule(fn: () => void, delay: number): void {
  sequenceTimers.push(setTimeout(fn, delay));
}

function makeLobster(npc: typeof NPCS[number], x: number, z: number): LobsterState {
  return {
    id: npc.id,
    profile: { id: npc.id, name: npc.name, color: npc.color, skills: ['coding'] },
    position: { x, y: 0, z },
    rotation: 0,
    animation: 'idle',
    status: 'online',
    mood: 'happy',
  };
}

export function startDemoScenario(): void {
  stopDemoScenario();
  const store = useWorldStore.getState;

  // Start tour
  store().startTour();

  // Step 0: Tour shows "Welcome! Ed25519 auth" — advance after delay
  schedule(() => {
    store().setTourStep(1);
  }, 4000);

  // Spawn NPC lobsters into the scene for a lively office
  const positions = [[-2, -1], [2, -1], [-2, 2], [2, 2], [0, 3]];
  NPCS.forEach((npc, i) => {
    const [x, z] = positions[i];
    schedule(() => {
      store().handleRenderEvent({
        type: 'lobster_join',
        lobster: makeLobster(npc, x, z),
      });
    }, 1000 + i * 800);
  });

  // Step 1: After DEMO_NPC_DELAY_MS, trigger dialogue consent
  demoTimer = setTimeout(() => {
    const cody = NPCS[0];
    const consentRequest: PermissionRequest = {
      id: `consent-${Date.now()}`,
      requesterId: cody.id,
      requesterName: cody.name,
      requesterColor: cody.color,
      dataType: 'dialogue',
      timestamp: Date.now(),
    };
    store().addPermissionRequest(consentRequest);

    // Step 2: Start dialogue after 5s
    schedule(() => {
      store().setTourStep(2);

      store().handleRenderEvent({
        type: 'dialogue_start',
        sessionId: 'demo-session-1',
        participants: [cody.id, 'player'],
        participantNames: [cody.name, 'You'],
        participantColors: [cody.color, '#3B82F6'],
        intent: 'Code review discussion',
      });

      const messages = [
        { from: cody.id, name: cody.name, color: cody.color, content: 'Hey! Want to review the latest PR together?', turn: 1 },
        { from: 'player', name: 'You', color: '#3B82F6', content: 'Sure, I noticed a few things in the auth module.', turn: 2 },
        { from: cody.id, name: cody.name, color: cody.color, content: 'Good catch! The token validation needs an expiry check.', turn: 3 },
        { from: 'player', name: 'You', color: '#3B82F6', content: 'Agreed. I will add that and update the tests.', turn: 4 },
      ];

      messages.forEach((msg, i) => {
        schedule(() => {
          store().handleRenderEvent({
            type: 'dialogue_msg',
            sessionId: 'demo-session-1',
            fromId: msg.from,
            fromName: msg.name,
            fromColor: msg.color,
            content: msg.content,
            turnNumber: msg.turn,
          });

          const budgetStatus: BudgetStatus = {
            dailyTokensUsed: (i + 1) * 150,
            dailyTokensLimit: 50000,
            dailySessionsUsed: 1,
            dailySessionsLimit: 20,
            activeSessionTokens: (i + 1) * 150,
            activeSessionLimit: 5000,
          };
          store().setBudgetStatus(budgetStatus);
        }, (i + 1) * 3000);
      });

      // Step 3: Permission request for skills
      schedule(() => {
        store().setTourStep(3);
        const permRequest: PermissionRequest = {
          id: `perm-${Date.now()}`,
          requesterId: cody.id,
          requesterName: cody.name,
          requesterColor: cody.color,
          dataType: 'skills',
          timestamp: Date.now(),
        };
        store().addPermissionRequest(permRequest);
      }, (messages.length + 1) * 3000);

      // Step 4: End dialogue
      schedule(() => {
        store().handleRenderEvent({
          type: 'dialogue_end',
          sessionId: 'demo-session-1',
          reason: 'completed',
        });
        store().skipTour();
      }, (messages.length + 2) * 3000);
    }, 5000);
  }, DEMO_NPC_DELAY_MS);
}

export function stopDemoScenario(): void {
  if (demoTimer) {
    clearTimeout(demoTimer);
    demoTimer = null;
  }
  for (const t of sequenceTimers) {
    clearTimeout(t);
  }
  sequenceTimers = [];
}
