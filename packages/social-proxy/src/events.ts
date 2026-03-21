import type {
  AnimationType,
  MoodType,
  StatusType,
  Vec3,
  LobsterState,
  DialogueType,
} from '@lobster-world/protocol';

export type EventType = 'state_update' | 'activity_update' | 'dialogue_request';

type StateUpdatePayload = Partial<LobsterState>;
type ActivityUpdatePayload = { activity: string; mood?: MoodType };
type DialogueRequestPayload = { targetId: string; intent: string; dialogueType: DialogueType };

type EventPayloadMap = {
  state_update: StateUpdatePayload;
  activity_update: ActivityUpdatePayload;
  dialogue_request: DialogueRequestPayload;
};

type EventHandler<T extends EventType> = (payload: EventPayloadMap[T]) => void;

export class EventEmitter {
  private listeners = new Map<EventType, Set<EventHandler<EventType>>>();

  on<T extends EventType>(event: T, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler<EventType>);
  }

  off<T extends EventType>(event: T, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler as EventHandler<EventType>);
  }

  private emit<T extends EventType>(event: T, payload: EventPayloadMap[T]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(payload);
      }
    }
  }

  emitAnimationChange(animation: AnimationType): void {
    this.emit('state_update', { animation });
  }

  emitMoodChange(mood: MoodType): void {
    this.emit('state_update', { mood });
  }

  emitStatusChange(status: StatusType): void {
    this.emit('state_update', { status });
  }

  emitPositionChange(position: Vec3): void {
    this.emit('state_update', { position });
  }

  emitActivityChange(activity: string, mood?: MoodType): void {
    this.emit('activity_update', { activity, mood });
  }

  emitDialogueRequest(targetId: string, intent: string, dialogueType: DialogueType): void {
    this.emit('dialogue_request', { targetId, intent, dialogueType });
  }
}
