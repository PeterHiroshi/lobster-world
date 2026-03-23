// --- Agent-to-Agent (A2A) Protocol Types ---

// --- Message Types ---

export type A2AMessageType =
  | 'task_delegate'
  | 'task_accept'
  | 'task_reject'
  | 'task_update'
  | 'task_complete'
  | 'review_request'
  | 'review_response'
  | 'knowledge_share'
  | 'knowledge_ack'
  | 'collab_invite'
  | 'collab_join'
  | 'collab_leave'
  | 'ping'
  | 'pong';

// --- Payload Types (discriminated by message type) ---

export interface TaskDelegatePayload {
  taskId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: number;
}

export interface TaskAcceptPayload {
  taskId: string;
  estimatedCompletion?: number;
}

export interface TaskRejectPayload {
  taskId: string;
  reason: string;
}

export interface TaskUpdatePayload {
  taskId: string;
  progress: number; // 0-100
  note?: string;
}

export interface TaskCompletePayload {
  taskId: string;
  summary: string;
  artifacts?: string[];
}

export interface ReviewRequestPayload {
  submissionId: string;
  title: string;
  language: string;
  urgency: 'low' | 'normal' | 'high';
}

export interface ReviewResponsePayload {
  submissionId: string;
  status: 'approved' | 'rejected' | 'changes_requested';
  comments: string;
}

export interface KnowledgeSharePayload {
  topic: string;
  content: string;
  tags: string[];
}

export interface KnowledgeAckPayload {
  topic: string;
  useful: boolean;
}

export interface CollabInvitePayload {
  sessionId: string;
  topic: string;
  description: string;
}

export interface CollabJoinPayload {
  sessionId: string;
}

export interface CollabLeavePayload {
  sessionId: string;
  reason?: string;
}

export interface PingPayload {
  message?: string;
}

export interface PongPayload {
  message?: string;
}

// --- Payload Map (maps message type to payload type) ---

export interface A2APayloadMap {
  task_delegate: TaskDelegatePayload;
  task_accept: TaskAcceptPayload;
  task_reject: TaskRejectPayload;
  task_update: TaskUpdatePayload;
  task_complete: TaskCompletePayload;
  review_request: ReviewRequestPayload;
  review_response: ReviewResponsePayload;
  knowledge_share: KnowledgeSharePayload;
  knowledge_ack: KnowledgeAckPayload;
  collab_invite: CollabInvitePayload;
  collab_join: CollabJoinPayload;
  collab_leave: CollabLeavePayload;
  ping: PingPayload;
  pong: PongPayload;
}

// --- A2A Message (generic over message type) ---

export interface A2AMessage<T extends A2AMessageType = A2AMessageType> {
  id: string;
  type: T;
  from: string;
  to: string | string[];
  payload: A2APayloadMap[T];
  timestamp: number;
  correlationId?: string;
  ttl?: number;
}

// --- A2A Stats ---

export interface A2AStats {
  totalMessages: number;
  pendingMessages: number;
  activeCorrelations: number;
  messagesByType: Partial<Record<A2AMessageType, number>>;
}

// --- A2A Send Request (for REST/WS) ---

export interface A2ASendRequest {
  type: A2AMessageType;
  from: string;
  to: string | string[];
  payload: A2APayloadMap[A2AMessageType];
  correlationId?: string;
  ttl?: number;
}
