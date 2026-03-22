import { useWorldStore } from '../store/useWorldStore';
import type { PermissionRequest, BudgetStatus } from '@lobster-world/protocol';
import { DEMO_NPC_DELAY_MS } from '@lobster-world/protocol';

const NPC_NAME = 'Cody';
const NPC_COLOR = '#ff6b6b';
const NPC_ID = 'cody-npc';

let demoTimer: ReturnType<typeof setTimeout> | null = null;
let sequenceTimers: ReturnType<typeof setTimeout>[] = [];

export function startDemoScenario(): void {
  stopDemoScenario();
  const store = useWorldStore.getState;

  // Step 1: After DEMO_NPC_DELAY_MS, trigger dialogue consent request (via store event)
  demoTimer = setTimeout(() => {
    // Simulate NPC dialogue consent request as a permission request
    const consentRequest: PermissionRequest = {
      id: `consent-${Date.now()}`,
      requesterId: NPC_ID,
      requesterName: NPC_NAME,
      requesterColor: NPC_COLOR,
      dataType: 'dialogue',
      timestamp: Date.now(),
    };
    store().addPermissionRequest(consentRequest);

    // Step 2: After 5s, simulate dialogue start + chat messages
    const t1 = setTimeout(() => {
      store().handleRenderEvent({
        type: 'dialogue_start',
        sessionId: 'demo-session-1',
        participants: [NPC_ID, 'player'],
        participantNames: [NPC_NAME, 'You'],
        participantColors: [NPC_COLOR, '#3B82F6'],
        intent: 'Code review discussion',
      });

      // Chat messages at intervals
      const messages = [
        { from: NPC_ID, name: NPC_NAME, color: NPC_COLOR, content: 'Hey! Want to review the latest PR together?', turn: 1 },
        { from: 'player', name: 'You', color: '#3B82F6', content: 'Sure, I noticed a few things in the auth module.', turn: 2 },
        { from: NPC_ID, name: NPC_NAME, color: NPC_COLOR, content: 'Good catch! The token validation needs an expiry check.', turn: 3 },
        { from: 'player', name: 'You', color: '#3B82F6', content: 'Agreed. I will add that and update the tests.', turn: 4 },
      ];

      messages.forEach((msg, i) => {
        const t = setTimeout(() => {
          store().handleRenderEvent({
            type: 'dialogue_msg',
            sessionId: 'demo-session-1',
            fromId: msg.from,
            fromName: msg.name,
            fromColor: msg.color,
            content: msg.content,
            turnNumber: msg.turn,
          });

          // Update budget after each message
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
        sequenceTimers.push(t);
      });

      // Step 3: After all messages, trigger permission request
      const permTimer = setTimeout(() => {
        const permRequest: PermissionRequest = {
          id: `perm-${Date.now()}`,
          requesterId: NPC_ID,
          requesterName: NPC_NAME,
          requesterColor: NPC_COLOR,
          dataType: 'skills',
          timestamp: Date.now(),
        };
        store().addPermissionRequest(permRequest);
      }, (messages.length + 1) * 3000);
      sequenceTimers.push(permTimer);

      // Step 4: End dialogue
      const endTimer = setTimeout(() => {
        store().handleRenderEvent({
          type: 'dialogue_end',
          sessionId: 'demo-session-1',
          reason: 'completed',
        });
      }, (messages.length + 2) * 3000);
      sequenceTimers.push(endTimer);
    }, 5000);
    sequenceTimers.push(t1);
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
