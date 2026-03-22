// --- Role Types ---

export interface AgentRole {
  id: string;
  name: string;
  icon: string;
  color: string;
  responsibilities: string[];
  behaviorWeights: {
    coding: number;
    meeting: number;
    reviewing: number;
    socializing: number;
  };
}

// --- Task Types ---

export type TaskStatus = 'todo' | 'doing' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  createdBy: string;
  subtasks: string[];
  createdAt: number;
  updatedAt: number;
}

// --- Agent Communication Types ---

export type MessageType = 'direct' | 'broadcast' | 'meeting' | 'async' | 'review';

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'all';
  type: MessageType;
  context?: { taskId?: string; docId?: string };
  content: string;
  timestamp: number;
}

export interface Meeting {
  id: string;
  topic: string;
  participants: string[];
  messages: AgentMessage[];
  decisions: string[];
  status: 'active' | 'ended';
}

// --- Platform Event Types ---

export type PlatformEventSource = 'internal' | 'github' | 'linear' | 'notion' | 'slack';

export interface PlatformEvent {
  id: string;
  source: PlatformEventSource;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  processedBy?: string;
}

// --- Meeting Status (convenience alias) ---

export type MeetingStatus = Meeting['status'];
