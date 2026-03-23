import type {
  Task,
  TaskStatus,
  TaskPriority,
  Meeting,
  MemoryEntry,
  MemoryCategory,
  CodeSubmission,
  CodeSubmissionStatus,
  MessageType,
  AgentMessage,
  LobsterState,
  Scene,
  A2AMessage,
  A2AMessageType,
  A2AStats,
  A2APayloadMap,
} from '@lobster-world/protocol';
import { REST_TIMEOUT_MS } from './constants.js';

// ============================================================
// Platform Client Configuration
// ============================================================

export interface PlatformClientConfig {
  serverUrl: string;
  wsUrl: string;
  displayName: string;
  color: string;
  skills: string[];
}

// ============================================================
// REST Request/Response Types
// ============================================================

interface TaskFilters {
  status?: TaskStatus;
  assignee?: string;
  project?: string;
}

interface CreateTaskOpts {
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  createdBy: string;
  assigneeId?: string;
}

interface UpdateTaskOpts {
  title?: string;
  description?: string;
  priority?: TaskPriority;
}

interface SendMessageOpts {
  from: string;
  to: string;
  type: MessageType;
  content: string;
  context?: { taskId?: string; docId?: string };
}

interface DocFilters {
  category?: MemoryCategory;
  tag?: string;
}

interface CreateDocOpts {
  category: MemoryCategory;
  title: string;
  content: string;
  author: string;
  tags: string[];
}

interface UpdateDocOpts {
  title?: string;
  content?: string;
  tags?: string[];
  category?: MemoryCategory;
}

interface SubmitCodeOpts {
  title: string;
  code: string;
  language: string;
  author: string;
}

interface ReviewCodeOpts {
  reviewerId: string;
  status: CodeSubmissionStatus;
  comment: string;
}

// ============================================================
// Platform Client
// ============================================================

export class PlatformClient {
  private readonly config: PlatformClientConfig;
  private connected: boolean = false;

  constructor(config: PlatformClientConfig) {
    this.config = config;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): PlatformClientConfig {
    return this.config;
  }

  // --- Private REST helpers ---

  private async restGet<T>(path: string): Promise<T> {
    const response = await fetch(`${this.config.serverUrl}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`REST GET ${path} failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  private async restPost<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.config.serverUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`REST POST ${path} failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  private async restPut<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.config.serverUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`REST PUT ${path} failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  private async restDelete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.config.serverUrl}${path}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(REST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`REST DELETE ${path} failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  private buildQuery(params: Record<string, string | undefined>): string {
    const entries = Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    );
    if (entries.length === 0) return '';
    return '?' + new URLSearchParams(entries).toString();
  }

  // --- World / Scene ---

  async getWorldStatus(): Promise<unknown> {
    return this.restGet('/api/world');
  }

  async getScene(): Promise<Scene> {
    return this.restGet<Scene>('/api/scene');
  }

  async getLobsters(): Promise<LobsterState[]> {
    return this.restGet<LobsterState[]>('/api/lobsters');
  }

  // --- Tasks ---

  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    const query = filters
      ? this.buildQuery({ status: filters.status, assignee: filters.assignee, project: filters.project })
      : '';
    return this.restGet<Task[]>(`/api/tasks${query}`);
  }

  async getTask(id: string): Promise<Task> {
    return this.restGet<Task>(`/api/tasks/${id}`);
  }

  async createTask(opts: CreateTaskOpts): Promise<Task> {
    return this.restPost<Task>('/api/tasks', opts);
  }

  async updateTask(id: string, opts: UpdateTaskOpts): Promise<Task> {
    return this.restPut<Task>(`/api/tasks/${id}`, opts);
  }

  async transitionTask(id: string, status: TaskStatus): Promise<Task> {
    return this.restPost<Task>(`/api/tasks/${id}/transition`, { status });
  }

  async assignTask(id: string, assigneeId: string): Promise<Task> {
    return this.restPost<Task>(`/api/tasks/${id}/assign`, { assigneeId });
  }

  // --- Meetings ---

  async getMeetings(): Promise<Meeting[]> {
    return this.restGet<Meeting[]>('/api/meetings');
  }

  async createMeeting(topic: string, participants: string[]): Promise<Meeting> {
    return this.restPost<Meeting>('/api/meetings', { topic, participants });
  }

  async endMeeting(id: string): Promise<Meeting> {
    return this.restDelete<Meeting>(`/api/meetings/${id}`);
  }

  // --- Messages ---

  async sendMessage(opts: SendMessageOpts): Promise<AgentMessage> {
    return this.restPost<AgentMessage>('/api/messages', opts);
  }

  // --- Documents ---

  async getDocs(filters?: DocFilters): Promise<MemoryEntry[]> {
    const query = filters
      ? this.buildQuery({ category: filters.category, tag: filters.tag })
      : '';
    return this.restGet<MemoryEntry[]>(`/api/docs${query}`);
  }

  async getDoc(id: string): Promise<MemoryEntry> {
    return this.restGet<MemoryEntry>(`/api/docs/${id}`);
  }

  async createDoc(opts: CreateDocOpts): Promise<MemoryEntry> {
    return this.restPost<MemoryEntry>('/api/docs', opts);
  }

  async updateDoc(id: string, opts: UpdateDocOpts): Promise<MemoryEntry> {
    return this.restPut<MemoryEntry>(`/api/docs/${id}`, opts);
  }

  // --- Code Review ---

  async submitCode(opts: SubmitCodeOpts): Promise<CodeSubmission> {
    return this.restPost<CodeSubmission>('/api/code/submit', opts);
  }

  async reviewCode(id: string, opts: ReviewCodeOpts): Promise<CodeSubmission> {
    return this.restPost<CodeSubmission>(`/api/code/${id}/review`, opts);
  }

  async getCodeSubmissions(filters?: { status?: CodeSubmissionStatus; author?: string }): Promise<CodeSubmission[]> {
    const query = filters ? this.buildQuery(filters) : '';
    return this.restGet<CodeSubmission[]>(`/api/code/submissions${query}`);
  }

  // --- A2A (Agent-to-Agent) ---

  async a2aSend(opts: {
    type: A2AMessageType;
    from: string;
    to: string | string[];
    payload: A2APayloadMap[A2AMessageType];
    correlationId?: string;
    ttl?: number;
  }): Promise<A2AMessage> {
    return this.restPost<A2AMessage>('/api/a2a/send', opts);
  }

  async a2aGetPending(agentId: string): Promise<A2AMessage[]> {
    return this.restGet<A2AMessage[]>(`/api/a2a/pending/${agentId}`);
  }

  async a2aAck(messageId: string, agentId: string): Promise<{ acked: boolean }> {
    return this.restPost<{ acked: boolean }>(`/api/a2a/ack/${messageId}`, { agentId });
  }

  async a2aGetChain(correlationId: string): Promise<A2AMessage[]> {
    return this.restGet<A2AMessage[]>(`/api/a2a/chain/${correlationId}`);
  }

  async a2aGetStats(): Promise<A2AStats> {
    return this.restGet<A2AStats>('/api/a2a/stats');
  }
}
