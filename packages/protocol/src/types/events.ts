import type {
  PublicProfile,
  LobsterState,
  Scene,
  Vec3,
  MoodType,
  EmoteType,
} from './core.js';
import type { DialogueType, SessionStats } from './dialogue.js';
import type { Task, TaskStatus, Meeting, PlatformEvent } from './workforce.js';
import type { PermissionRequest, BudgetStatus } from './lobby.js';
import type { A2AMessage } from './a2a.js';
import type { KeyExchangeRequest, KeyExchangeResponse, EncryptedDialogueMessage } from './crypto.js';

// --- Protocol Events ---

// Upstream: Lobster (Social Proxy) → Platform
export type UpstreamEvent =
  | { type: 'register'; profile: PublicProfile; token: string }
  | { type: 'heartbeat' }
  | { type: 'state_update'; state: Partial<LobsterState> }
  | { type: 'activity_update'; activity: string; mood?: MoodType }
  | { type: 'dialogue_request'; targetId: string; intent: string; dialogueType: DialogueType }
  | { type: 'dialogue_message'; sessionId: string; content: string }
  | { type: 'dialogue_end'; sessionId: string; reason: string }
  | { type: 'dialogue_accept'; sessionId: string }
  | { type: 'dialogue_reject'; sessionId: string; reason?: string }
  | { type: 'emote'; emote: EmoteType }
  | { type: 'a2a_send'; message: A2AMessage }
  | KeyExchangeRequest
  | KeyExchangeResponse
  | EncryptedDialogueMessage;

// Downstream: Platform → Lobster (Social Proxy)
export type DownstreamEvent =
  | { type: 'registered'; lobsterId: string; scene: Scene }
  | { type: 'scene_state'; lobsters: LobsterState[]; delta: boolean }
  | { type: 'dialogue_invite'; sessionId: string; from: PublicProfile; intent: string; dialogueType: DialogueType }
  | { type: 'dialogue_message'; sessionId: string; from: string; content: string; turnNumber: number }
  | { type: 'dialogue_ended'; sessionId: string; reason: string; stats: SessionStats }
  | { type: 'budget_warning'; remaining: number; limit: number }
  | { type: 'system_notice'; message: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'a2a_message'; message: A2AMessage }
  | KeyExchangeRequest
  | KeyExchangeResponse
  | EncryptedDialogueMessage;

// Render: Platform → Frontend
export type RenderEvent =
  | { type: 'full_sync'; scene: Scene }
  | { type: 'lobster_join'; lobster: LobsterState }
  | { type: 'lobster_leave'; lobsterId: string }
  | { type: 'lobster_update'; lobsterId: string; delta: Partial<LobsterState> }
  | { type: 'dialogue_bubble'; lobsterIds: string[]; preview?: string }
  | { type: 'dialogue_start'; sessionId: string; participants: string[]; participantNames: string[]; participantColors: string[]; intent: string }
  | { type: 'dialogue_msg'; sessionId: string; fromId: string; fromName: string; fromColor: string; content: string; turnNumber: number }
  | { type: 'dialogue_end'; sessionId: string; reason: string }
  | { type: 'effect'; position: Vec3; effectType: string }
  | { type: 'task_update'; task: Task }
  | { type: 'task_card_move'; taskId: string; fromStatus: TaskStatus; toStatus: TaskStatus; assigneeId?: string }
  | { type: 'meeting_start'; meeting: Meeting }
  | { type: 'meeting_end'; meetingId: string }
  | { type: 'platform_event'; event: PlatformEvent }
  | { type: 'team_sync'; agents: Array<{ id: string; roleId: string; name: string; color: string }> }
  | { type: 'permission_request'; request: PermissionRequest }
  | { type: 'budget_status'; status: BudgetStatus }
  | { type: 'a2a_task_delegate'; fromId: string; toId: string; taskTitle: string }
  | { type: 'a2a_review_request'; fromId: string; toId: string; title: string }
  | { type: 'a2a_knowledge_share'; fromId: string; topic: string; recipients: string[] }
  | { type: 'a2a_collab_start'; sessionId: string; participants: string[]; topic: string }
  | { type: 'dialogue_encrypted'; sessionId: string; participants: string[] }
  | { type: 'encrypted_dialogue_msg'; sessionId: string; fromId: string; fromName: string; fromColor: string; turnNumber: number };
