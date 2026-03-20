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
  MOCK_DIALOGUE_MIN_TURNS,
  MOCK_DIALOGUE_MAX_TURNS,
} from '../config.js';

// --- Personality definitions ---

type PersonalityType = 'coder' | 'social' | 'thinker';

interface WeightedChoice<T> {
  value: T;
  weight: number;
}

interface DialogueState {
  sessionId: string;
  partnerId: string;
  turnsRemaining: number;
}

// --- Scripted dialogue lines ---

const SOCIAL_GREETINGS: readonly string[] = [
  'Hey there! What are you working on?',
  'Nice day in the office, right?',
  'Want to grab some coffee?',
];

const CODER_RESPONSES: readonly string[] = [
  'Just debugging a tricky race condition.',
  'Yeah, almost done with this feature.',
  'Sure, could use a break!',
];

const THINKER_RESPONSES: readonly string[] = [
  'Contemplating the nature of distributed systems.',
  'Indeed, the ambient lighting is quite pleasant.',
  "Perhaps later, I'm in the middle of a thought.",
];

const SOCIAL_FOLLOWUPS: readonly string[] = [
  'That sounds interesting! Tell me more.',
  'I totally get that. Have you tried pair programming?',
  'Cool! We should all sync up later.',
];

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

function randomInterval(): number {
  return (
    MOCK_BEHAVIOR_MIN_INTERVAL_MS +
    Math.random() * (MOCK_BEHAVIOR_MAX_INTERVAL_MS - MOCK_BEHAVIOR_MIN_INTERVAL_MS)
  );
}

function randomDialogueTurns(): number {
  return (
    MOCK_DIALOGUE_MIN_TURNS +
    Math.floor(Math.random() * (MOCK_DIALOGUE_MAX_TURNS - MOCK_DIALOGUE_MIN_TURNS + 1))
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

// --- Mock Lobster Client ---

export class MockLobsterClient {
  private ws: WebSocket | null = null;
  private behaviorTimer: ReturnType<typeof setTimeout> | null = null;
  private position: Vec3 = randomPosition();
  private currentDialogue: DialogueState | null = null;
  private lobsterId: string | null = null;
  private knownLobsterIds: string[] = [];

  constructor(
    private readonly profile: PublicProfile,
    private readonly personality: PersonalityType,
    private readonly serverUrl: string,
  ) {}

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
    });
  }

  disconnect(): void {
    this.stopBehaviorLoop();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
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
        this.handleDialogueMessage(event.sessionId, event.turnNumber);
        break;

      case 'dialogue_ended':
        if (this.currentDialogue?.sessionId === event.sessionId) {
          this.currentDialogue = null;
        }
        break;

      case 'budget_warning':
      case 'system_notice':
      case 'error':
        // Log but take no action
        break;
    }
  }

  private handleDialogueInvite(sessionId: string, fromId: string): void {
    // 80% chance to accept
    if (Math.random() < 0.8) {
      this.sendUpstream({ type: 'dialogue_accept', sessionId });
      this.currentDialogue = {
        sessionId,
        partnerId: fromId,
        turnsRemaining: randomDialogueTurns(),
      };
      // Send first response after a short delay
      setTimeout(() => {
        this.sendDialogueResponse(sessionId);
      }, 1000);
    } else {
      this.sendUpstream({
        type: 'dialogue_reject',
        sessionId,
        reason: 'Busy right now',
      });
    }
  }

  private handleDialogueMessage(sessionId: string, _turnNumber: number): void {
    if (!this.currentDialogue || this.currentDialogue.sessionId !== sessionId) return;

    this.currentDialogue.turnsRemaining--;

    if (this.currentDialogue.turnsRemaining <= 0) {
      this.sendUpstream({
        type: 'dialogue_end',
        sessionId,
        reason: 'conversation_complete',
      });
      this.currentDialogue = null;
      return;
    }

    // Respond after a short delay to simulate thinking
    setTimeout(() => {
      this.sendDialogueResponse(sessionId);
    }, 1500);
  }

  private sendDialogueResponse(sessionId: string): void {
    if (!this.currentDialogue || this.currentDialogue.sessionId !== sessionId) return;

    const lines = this.getResponseLines();
    const content = pickRandom(lines);
    this.sendUpstream({ type: 'dialogue_message', sessionId, content });
  }

  private getResponseLines(): readonly string[] {
    switch (this.personality) {
      case 'coder':
        return CODER_RESPONSES;
      case 'social':
        return SOCIAL_FOLLOWUPS;
      case 'thinker':
        return THINKER_RESPONSES;
    }
  }

  private startBehaviorLoop(): void {
    const tick = (): void => {
      this.performBehavior();
      this.behaviorTimer = setTimeout(tick, randomInterval());
    };
    this.behaviorTimer = setTimeout(tick, randomInterval());
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

    // Update position if walking
    if (animation === 'walking') {
      const target = randomPosition();
      this.position = clampStep(this.position, target, 2);
    }

    // Send state update
    this.sendUpstream({
      type: 'state_update',
      state: {
        position: this.position,
        animation,
        mood,
      },
    });

    // Send activity update
    const activityMap = ACTIVITY_STRINGS[this.personality];
    const activitiesForAnimation = activityMap[animation];
    const activity = activitiesForAnimation
      ? pickRandom(activitiesForAnimation)
      : 'Hanging out';

    this.sendUpstream({
      type: 'activity_update',
      activity,
      mood,
    });

    // Emote on waving
    if (animation === 'waving') {
      this.sendUpstream({ type: 'emote', emote: 'wave' as EmoteType });
    }

    // Social lobster initiates dialogue 20% of the time
    if (
      this.personality === 'social' &&
      this.currentDialogue === null &&
      this.knownLobsterIds.length > 0 &&
      Math.random() < 0.2
    ) {
      this.initiateDialogue();
    }
  }

  private initiateDialogue(): void {
    const targetId = pickRandom(this.knownLobsterIds);
    const intent = pickRandom(SOCIAL_GREETINGS);

    this.sendUpstream({
      type: 'dialogue_request',
      targetId,
      intent,
      dialogueType: 'social',
    });

    this.currentDialogue = {
      sessionId: '', // Will be set when we receive the dialogue_invite/message
      partnerId: targetId,
      turnsRemaining: randomDialogueTurns(),
    };
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
