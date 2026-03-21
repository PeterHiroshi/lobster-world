import WebSocket from 'ws';
import type {
  PublicProfile,
  UpstreamEvent,
  DownstreamEvent,
  AnimationType,
  MoodType,
  EmoteType,
  Vec3,
} from '@lobster-world/protocol';
import {
  MOCK_BEHAVIOR_MIN_INTERVAL_MS,
  MOCK_BEHAVIOR_MAX_INTERVAL_MS,
  MOCK_DIALOGUE_INTERVAL_MIN_MS,
  MOCK_DIALOGUE_INTERVAL_MAX_MS,
} from '../config.js';
import type { PersonalityType, DialogueScript, DialogueTurn } from './dialogues.js';
import { DIALOGUE_SCRIPTS } from './dialogues.js';

// Re-export PersonalityType for tests
export type { PersonalityType };

// --- Types ---

interface WeightedChoice<T> {
  value: T;
  weight: number;
}

interface ScriptedDialogueState {
  sessionId: string;
  partnerId: string;
  script: DialogueScript;
  currentTurnIndex: number;
}

// --- Utility functions ---

function pickWeighted<T>(choices: WeightedChoice<T>[]): T {
  const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const choice of choices) {
    roll -= choice.weight;
    if (roll <= 0) return choice.value;
  }
  return choices[choices.length - 1].value;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBehaviorInterval(): number {
  return (
    MOCK_BEHAVIOR_MIN_INTERVAL_MS +
    Math.random() * (MOCK_BEHAVIOR_MAX_INTERVAL_MS - MOCK_BEHAVIOR_MIN_INTERVAL_MS)
  );
}

function randomDialogueInterval(): number {
  return (
    MOCK_DIALOGUE_INTERVAL_MIN_MS +
    Math.random() * (MOCK_DIALOGUE_INTERVAL_MAX_MS - MOCK_DIALOGUE_INTERVAL_MIN_MS)
  );
}

function clampStep(current: Vec3, target: Vec3, maxStep: number): Vec3 {
  const dx = target.x - current.x;
  const dz = target.z - current.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist <= maxStep) return target;
  const scale = maxStep / dist;
  return {
    x: current.x + dx * scale,
    y: current.y,
    z: current.z + dz * scale,
  };
}

function randomPosition(): Vec3 {
  return {
    x: (Math.random() - 0.5) * 20,
    y: 0,
    z: (Math.random() - 0.5) * 20,
  };
}

// --- Behavior configs per personality ---

const CODER_ANIMATIONS: WeightedChoice<AnimationType>[] = [
  { value: 'working', weight: 70 },
  { value: 'walking', weight: 15 },
  { value: 'idle', weight: 15 },
];

const CODER_MOODS: WeightedChoice<MoodType>[] = [
  { value: 'focused', weight: 60 },
  { value: 'tired', weight: 20 },
  { value: 'neutral', weight: 20 },
];

const SOCIAL_ANIMATIONS: WeightedChoice<AnimationType>[] = [
  { value: 'walking', weight: 40 },
  { value: 'waving', weight: 20 },
  { value: 'chatting', weight: 20 },
  { value: 'idle', weight: 20 },
];

const SOCIAL_MOODS: WeightedChoice<MoodType>[] = [
  { value: 'happy', weight: 50 },
  { value: 'excited', weight: 30 },
  { value: 'neutral', weight: 20 },
];

const THINKER_ANIMATIONS: WeightedChoice<AnimationType>[] = [
  { value: 'thinking', weight: 40 },
  { value: 'working', weight: 30 },
  { value: 'idle', weight: 20 },
  { value: 'walking', weight: 10 },
];

const THINKER_MOODS: WeightedChoice<MoodType>[] = [
  { value: 'focused', weight: 40 },
  { value: 'neutral', weight: 40 },
  { value: 'happy', weight: 20 },
];

const ACTIVITY_STRINGS: Record<PersonalityType, Record<string, readonly string[]>> = {
  coder: {
    working: ['Writing TypeScript', 'Debugging race condition', 'Reviewing PR'],
    walking: ['Heading to coffee area', 'Stretching legs'],
    idle: ['Taking a breather', 'Reading docs'],
  },
  social: {
    walking: ['Mingling around the office', 'Checking in on everyone'],
    waving: ['Waving hello!', 'Greeting a colleague'],
    chatting: ['Having a chat', 'Catching up on news'],
    idle: ['People watching', 'Checking messages'],
  },
  thinker: {
    thinking: ['Deep in thought', 'Pondering distributed consensus'],
    working: ['Writing a paper', 'Researching new ideas'],
    idle: ['Observing quietly', 'Meditating'],
    walking: ['Strolling thoughtfully'],
  },
};

// Dialogue initiation weights per personality
const DIALOGUE_INITIATION_CHANCE: Record<PersonalityType, number> = {
  social: 0.4,
  coder: 0.25,
  thinker: 0.2,
};

// --- Shared client registry (for finding partners by personality) ---
const clientRegistry = new Map<PersonalityType, MockLobsterClient>();

// --- Mock Lobster Client ---

export class MockLobsterClient {
  private ws: WebSocket | null = null;
  private behaviorTimer: ReturnType<typeof setTimeout> | null = null;
  private dialogueTimer: ReturnType<typeof setTimeout> | null = null;
  private position: Vec3 = randomPosition();
  private currentDialogue: ScriptedDialogueState | null = null;
  private lobsterId: string | null = null;
  private knownLobsterIds: string[] = [];
  private usedScriptIndices: Set<number> = new Set();

  constructor(
    private readonly profile: PublicProfile,
    readonly personality: PersonalityType,
    private readonly serverUrl: string,
  ) {
    clientRegistry.set(personality, this);
  }

  getLobsterId(): string | null {
    return this.lobsterId;
  }

  connect(): void {
    const url = `${this.serverUrl}/ws/lobster`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.sendUpstream({
        type: 'register',
        profile: this.profile,
        token: `mock-token-${this.profile.id}`,
      });
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      const event = JSON.parse(data.toString()) as DownstreamEvent;
      this.handleDownstream(event);
    });

    this.ws.on('error', (err: Error) => {
      console.error(`[MockLobster:${this.profile.name}] WebSocket error:`, err.message);
    });

    this.ws.on('close', () => {
      this.stopBehaviorLoop();
      this.stopDialogueLoop();
    });
  }

  disconnect(): void {
    this.stopBehaviorLoop();
    this.stopDialogueLoop();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    clientRegistry.delete(this.personality);
  }

  private sendUpstream(event: UpstreamEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  private handleDownstream(event: DownstreamEvent): void {
    switch (event.type) {
      case 'registered':
        this.lobsterId = event.lobsterId;
        this.knownLobsterIds = Object.keys(event.scene.lobsters).filter(
          (id) => id !== this.lobsterId,
        );
        console.log(`[MockLobster:${this.profile.name}] Registered as ${this.lobsterId}`);
        this.startBehaviorLoop();
        this.startDialogueLoop();
        break;

      case 'scene_state':
        this.knownLobsterIds = event.lobsters
          .map((l) => l.id)
          .filter((id) => id !== this.lobsterId);
        break;

      case 'dialogue_invite':
        this.handleDialogueInvite(event.sessionId, event.from.id);
        break;

      case 'dialogue_message':
        this.handleDialogueMessage(event.sessionId, event.content, event.turnNumber);
        break;

      case 'dialogue_ended':
        if (this.currentDialogue?.sessionId === event.sessionId) {
          this.currentDialogue = null;
        }
        break;

      case 'budget_warning':
      case 'system_notice':
      case 'error':
        break;
    }
  }

  private handleDialogueInvite(sessionId: string, fromId: string): void {
    // Always accept scripted dialogues (high rate)
    if (Math.random() < 0.9) {
      this.sendUpstream({ type: 'dialogue_accept', sessionId });

      // If we don't have a scripted dialogue, set up to respond from script
      if (!this.currentDialogue) {
        // Find the script that the initiator is using (by looking for partner that matches us)
        const partnerClient = [...clientRegistry.values()].find(
          (c) => c.getLobsterId() === fromId,
        );
        const partnerScript = partnerClient?.currentDialogue?.script;

        if (partnerScript) {
          this.currentDialogue = {
            sessionId,
            partnerId: fromId,
            script: partnerScript,
            currentTurnIndex: 0,
          };
        } else {
          // Fallback: pick a random script where we're the responder
          const fallbackScripts = DIALOGUE_SCRIPTS.filter((s) => s.responder === this.personality);
          const script = fallbackScripts.length > 0 ? pickRandom(fallbackScripts) : DIALOGUE_SCRIPTS[0];
          this.currentDialogue = {
            sessionId,
            partnerId: fromId,
            script,
            currentTurnIndex: 0,
          };
        }
      }

      // Send first response after short delay
      setTimeout(() => {
        this.sendNextScriptedTurn(sessionId);
      }, 1500 + Math.random() * 1000);
    } else {
      this.sendUpstream({
        type: 'dialogue_reject',
        sessionId,
        reason: 'Busy right now',
      });
    }
  }

  private handleDialogueMessage(sessionId: string, _content: string, _turnNumber: number): void {
    if (!this.currentDialogue || this.currentDialogue.sessionId !== sessionId) return;

    // Respond after a natural delay
    setTimeout(() => {
      this.sendNextScriptedTurn(sessionId);
    }, 2000 + Math.random() * 2000);
  }

  private sendNextScriptedTurn(sessionId: string): void {
    if (!this.currentDialogue || this.currentDialogue.sessionId !== sessionId) return;

    const { script, currentTurnIndex } = this.currentDialogue;

    // Find next turn where we're the speaker
    let nextIdx = currentTurnIndex;
    while (nextIdx < script.turns.length) {
      const turn: DialogueTurn = script.turns[nextIdx];
      if (turn.speaker === this.personality) {
        break;
      }
      nextIdx++;
    }

    if (nextIdx >= script.turns.length) {
      // No more turns for us — end the dialogue
      this.sendUpstream({
        type: 'dialogue_end',
        sessionId,
        reason: 'conversation_complete',
      });
      this.currentDialogue = null;
      return;
    }

    const turn: DialogueTurn = script.turns[nextIdx];
    this.sendUpstream({
      type: 'dialogue_message',
      sessionId,
      content: turn.content,
    });

    this.currentDialogue.currentTurnIndex = nextIdx + 1;

    // If this was the last turn, end the dialogue
    if (nextIdx + 1 >= script.turns.length) {
      setTimeout(() => {
        if (this.currentDialogue?.sessionId === sessionId) {
          this.sendUpstream({
            type: 'dialogue_end',
            sessionId,
            reason: 'conversation_complete',
          });
          this.currentDialogue = null;
        }
      }, 1000);
    }
  }

  private pickScript(): DialogueScript | undefined {
    const available = DIALOGUE_SCRIPTS
      .map((s, i) => ({ script: s, index: i }))
      .filter(({ script, index }) =>
        script.initiator === this.personality && !this.usedScriptIndices.has(index),
      );

    if (available.length === 0) {
      // Reset and reuse
      this.usedScriptIndices.clear();
      return this.pickScript();
    }

    const choice = pickRandom(available);
    this.usedScriptIndices.add(choice.index);
    return choice.script;
  }

  private startDialogueLoop(): void {
    const tick = (): void => {
      this.tryInitiateDialogue();
      this.dialogueTimer = setTimeout(tick, randomDialogueInterval());
    };
    // First dialogue after 10-20 seconds (let everyone connect)
    this.dialogueTimer = setTimeout(tick, 10000 + Math.random() * 10000);
  }

  private stopDialogueLoop(): void {
    if (this.dialogueTimer !== null) {
      clearTimeout(this.dialogueTimer);
      this.dialogueTimer = null;
    }
  }

  private tryInitiateDialogue(): void {
    if (this.currentDialogue !== null) return;
    if (this.knownLobsterIds.length === 0) return;
    if (Math.random() > DIALOGUE_INITIATION_CHANCE[this.personality]) return;

    const script = this.pickScript();
    if (!script) return;

    // Find the partner for this script
    const partnerClient = clientRegistry.get(script.responder);
    const targetId = partnerClient?.getLobsterId();

    if (!targetId || !this.knownLobsterIds.includes(targetId)) {
      // Partner not available, pick any known lobster
      const fallbackTargetId = pickRandom(this.knownLobsterIds);
      this.initiateWithScript(fallbackTargetId, script);
    } else {
      this.initiateWithScript(targetId, script);
    }
  }

  private initiateWithScript(targetId: string, script: DialogueScript): void {
    const firstTurn = script.turns[0];
    this.sendUpstream({
      type: 'dialogue_request',
      targetId,
      intent: firstTurn.content,
      dialogueType: script.topic.includes('Coffee') ? 'social' : 'collab',
    });

    this.currentDialogue = {
      sessionId: '', // Set on invite/message receipt
      partnerId: targetId,
      script,
      currentTurnIndex: 1, // First turn was the intent
    };
  }

  private startBehaviorLoop(): void {
    const tick = (): void => {
      this.performBehavior();
      this.behaviorTimer = setTimeout(tick, randomBehaviorInterval());
    };
    this.behaviorTimer = setTimeout(tick, randomBehaviorInterval());
  }

  private stopBehaviorLoop(): void {
    if (this.behaviorTimer !== null) {
      clearTimeout(this.behaviorTimer);
      this.behaviorTimer = null;
    }
  }

  private performBehavior(): void {
    const animationChoices = this.getAnimationChoices();
    const moodChoices = this.getMoodChoices();

    const animation = pickWeighted(animationChoices);
    const mood = pickWeighted(moodChoices);

    // Override animation if in dialogue
    const effectiveAnimation = this.currentDialogue ? 'chatting' as AnimationType : animation;

    // Update position if walking
    if (effectiveAnimation === 'walking') {
      const target = randomPosition();
      this.position = clampStep(this.position, target, 2);
    }

    this.sendUpstream({
      type: 'state_update',
      state: {
        position: this.position,
        animation: effectiveAnimation,
        mood,
      },
    });

    const activityMap = ACTIVITY_STRINGS[this.personality];
    const activitiesForAnimation = activityMap[effectiveAnimation];
    const activity = this.currentDialogue
      ? `Discussing: ${this.currentDialogue.script.topic}`
      : (activitiesForAnimation ? pickRandom(activitiesForAnimation) : 'Hanging out');

    this.sendUpstream({
      type: 'activity_update',
      activity,
      mood,
    });

    if (effectiveAnimation === 'waving') {
      this.sendUpstream({ type: 'emote', emote: 'wave' as EmoteType });
    }
  }

  private getAnimationChoices(): WeightedChoice<AnimationType>[] {
    switch (this.personality) {
      case 'coder':
        return CODER_ANIMATIONS;
      case 'social':
        return SOCIAL_ANIMATIONS;
      case 'thinker':
        return THINKER_ANIMATIONS;
    }
  }

  private getMoodChoices(): WeightedChoice<MoodType>[] {
    switch (this.personality) {
      case 'coder':
        return CODER_MOODS;
      case 'social':
        return SOCIAL_MOODS;
      case 'thinker':
        return THINKER_MOODS;
    }
  }
}

// --- Mock lobster profiles ---

const MOCK_PROFILES: { profile: PublicProfile; personality: PersonalityType }[] = [
  {
    profile: {
      id: 'mock-coder',
      name: 'Cody',
      color: '#4CAF50',
      skills: ['typescript', 'rust', 'systems'],
      bio: 'A dedicated coder lobster who loves debugging.',
    },
    personality: 'coder',
  },
  {
    profile: {
      id: 'mock-social',
      name: 'Suki',
      color: '#FF9800',
      skills: ['networking', 'communication', 'events'],
      bio: 'The social butterfly of the lobster world.',
    },
    personality: 'social',
  },
  {
    profile: {
      id: 'mock-thinker',
      name: 'Phil',
      color: '#9C27B0',
      skills: ['philosophy', 'research', 'writing'],
      bio: 'A contemplative lobster who ponders the big questions.',
    },
    personality: 'thinker',
  },
];

// --- Public entry point ---

export function startMockLobsters(serverUrl: string): MockLobsterClient[] {
  const clients: MockLobsterClient[] = MOCK_PROFILES.map(
    ({ profile, personality }) => new MockLobsterClient(profile, personality, serverUrl),
  );

  // Stagger connections by 1-2 seconds each
  clients.forEach((client, index) => {
    const delay = index * (1000 + Math.random() * 1000);
    setTimeout(() => {
      client.connect();
    }, delay);
  });

  return clients;
}
