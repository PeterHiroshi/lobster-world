import type { AnimationType, StatusType, MoodType } from '@lobster-world/protocol';
import { STATE_DEBOUNCE_MS } from './constants.js';

interface LobsterBehavior {
  animation: AnimationType;
  status: StatusType;
  mood: MoodType;
  activity?: string;
}

type StateUpdateCallback = (state: LobsterBehavior) => void;

const ACTIVITY_MAP: Record<string, LobsterBehavior> = {
  coding: { animation: 'working', status: 'busy', mood: 'focused' },
  chatting: { animation: 'chatting', status: 'online', mood: 'happy' },
  idle: { animation: 'idle', status: 'online', mood: 'neutral' },
  thinking: { animation: 'thinking', status: 'busy', mood: 'focused' },
  reviewing: { animation: 'working', status: 'busy', mood: 'focused' },
  sleeping: { animation: 'sleeping', status: 'away', mood: 'tired' },
  writing: { animation: 'working', status: 'busy', mood: 'focused' },
  researching: { animation: 'thinking', status: 'busy', mood: 'focused' },
  meeting: { animation: 'chatting', status: 'busy', mood: 'happy' },
  celebrating: { animation: 'celebrating', status: 'online', mood: 'excited' },
};

const DEFAULT_BEHAVIOR: LobsterBehavior = {
  animation: 'idle',
  status: 'online',
  mood: 'neutral',
};

export class EventMapper {
  private stateCallback: StateUpdateCallback | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  mapAgentActivity(activity: string): LobsterBehavior {
    return ACTIVITY_MAP[activity] ?? { ...DEFAULT_BEHAVIOR };
  }

  mapAgentEvent(eventType: string, data: Record<string, unknown>): LobsterBehavior {
    switch (eventType) {
      case 'task_started': {
        const taskType = (data.taskType as string) ?? 'coding';
        return { ...this.mapAgentActivity(taskType), activity: taskType };
      }
      case 'task_completed':
        return { animation: 'celebrating', status: 'online', mood: 'excited' };
      case 'message_received':
        return { animation: 'chatting', status: 'online', mood: 'happy' };
      case 'error_occurred':
        return { animation: 'thinking', status: 'busy', mood: 'tired' };
      default:
        return { ...DEFAULT_BEHAVIOR };
    }
  }

  onStateUpdate(callback: StateUpdateCallback): void {
    this.stateCallback = callback;
  }

  debouncedUpdate(activity: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      const behavior = this.mapAgentActivity(activity);
      this.stateCallback?.(behavior);
    }, STATE_DEBOUNCE_MS);
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.stateCallback = null;
  }
}
