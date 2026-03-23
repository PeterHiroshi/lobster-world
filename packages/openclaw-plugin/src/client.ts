import { EventEmitter } from 'node:events';
import type {
  SocialProxyUpstream,
  SocialProxyDownstream,
  SocialProfile,
  BudgetConfig,
  SocialPermissionPolicy,
  Scene,
} from '@lobster-world/protocol';
import {
  DEFAULT_SOCIAL_PERMISSION_POLICY,
} from '@lobster-world/protocol';
import { CryptoManager, type Keypair } from '@lobster-world/social-proxy';
import { OutputFilter } from '@lobster-world/social-proxy';
import {
  RECONNECT_INITIAL_DELAY_MS,
  RECONNECT_MAX_BACKOFF_MS,
  RECONNECT_BACKOFF_MULTIPLIER,
  PLUGIN_HEARTBEAT_INTERVAL_MS,
  type ClientState,
} from './constants.js';

export interface ClientConfig {
  serverUrl: string;
  displayName: string;
  bio?: string;
  color?: string;
  skills?: Array<'coding' | 'design' | 'devops' | 'testing' | 'writing' | 'research'>;
  permissionPreset?: 'open' | 'selective' | 'private';
  dailyTokenLimit?: number;
  sessionTokenLimit?: number;
}

interface WebSocketLike extends EventEmitter {
  readyState: number;
  send(data: string): void;
  close(): void;
}

type WsFactory = (url: string) => WebSocketLike;

export class SocialProxyClient extends EventEmitter {
  private state: ClientState = 'disconnected';
  private ws: WebSocketLike | null = null;
  private readonly config: ClientConfig;
  private readonly wsFactory: WsFactory;
  private readonly crypto = new CryptoManager();
  private readonly filter = new OutputFilter();
  private keypair: Keypair;
  private lobsterId: string;
  private sessionToken: string | null = null;
  private scene: Scene | null = null;
  private intentionalDisconnect = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ClientConfig, wsFactory: WsFactory) {
    super();
    this.config = config;
    this.wsFactory = wsFactory;
    this.keypair = this.crypto.generateKeypair();
    this.lobsterId = `lobster-${this.keypair.publicKey.slice(0, 16)}`;
  }

  getState(): ClientState {
    return this.state;
  }

  getLobsterId(): string | null {
    return this.lobsterId;
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  getScene(): Scene | null {
    return this.scene;
  }

  connect(): void {
    this.intentionalDisconnect = false;
    this.setState('connecting');
    this.createConnection();
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionToken = null;
    this.setState('disconnected');
  }

  sendDialogueMessage(sessionId: string, content: string): void {
    this.ensureJoined();
    const redacted = this.filter.redact(content);
    this.send({ type: 'dialogue_message', sessionId, content: redacted });
  }

  acceptDialogue(sessionId: string): void {
    this.ensureJoined();
    this.send({ type: 'dialogue_response', response: { sessionId, accepted: true } });
  }

  rejectDialogue(sessionId: string, reason?: string): void {
    this.ensureJoined();
    this.send({ type: 'dialogue_response', response: { sessionId, accepted: false, reason } });
  }

  sendStateUpdate(state: Record<string, unknown>): void {
    this.ensureJoined();
    this.send({ type: 'state_update', state } as SocialProxyUpstream);
  }

  private setState(newState: ClientState): void {
    this.state = newState;
    this.emit('state_change', newState);
  }

  private createConnection(): void {
    this.ws = this.wsFactory(this.config.serverUrl);

    this.ws.on('open', () => {
      this.setState('authenticating');
      this.sendInitialJoin();
    });

    this.ws.on('message', (data: string | Buffer) => {
      const raw = typeof data === 'string' ? data : data.toString();
      try {
        const msg = JSON.parse(raw) as SocialProxyDownstream;
        this.handleMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    });

    this.ws.on('close', (_code: number, _reason: string) => {
      this.clearHeartbeat();
      if (!this.intentionalDisconnect) {
        this.setState('reconnecting');
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err: Error) => {
      this.emit('error', err);
    });
  }

  private handleMessage(msg: SocialProxyDownstream): void {
    switch (msg.type) {
      case 'auth_challenge':
        this.handleAuthChallenge(msg.challenge.nonce);
        break;
      case 'lobby_result':
        this.handleLobbyResult(msg.result);
        break;
      case 'dialogue_invitation':
        this.emit('dialogue_invitation', msg.invitation);
        break;
      case 'dialogue_message':
        this.emit('dialogue_message', {
          sessionId: msg.sessionId,
          from: msg.from,
          content: msg.content,
          turnNumber: msg.turnNumber,
        });
        break;
      case 'dialogue_ended':
        this.emit('dialogue_ended', { sessionId: msg.sessionId, reason: msg.reason });
        break;
      case 'budget_warning':
        this.emit('budget_warning', {
          level: msg.level,
          tokensUsed: msg.tokensUsed,
          tokensLimit: msg.tokensLimit,
        });
        break;
      case 'reconnect_resume':
        this.scene = msg.scene;
        this.reconnectAttempt = 0;
        this.setState('joined');
        this.startHeartbeat();
        this.emit('reconnected', msg);
        break;
    }
  }

  private sendInitialJoin(): void {
    const profile = this.buildProfile();
    const budgetConfig = this.buildBudgetConfig();
    const permissions = this.buildPermissions();

    const joinRequest: SocialProxyUpstream = {
      type: 'lobby_join',
      request: {
        auth: {
          lobsterId: this.lobsterId,
          publicKey: this.keypair.publicKey,
          signature: '', // Empty signature triggers challenge
        },
        profile,
        budgetConfig,
        permissions,
      },
    };

    this.send(joinRequest);
  }

  private handleAuthChallenge(nonce: string): void {
    const signature = this.crypto.signNonce(nonce, this.keypair.secretKey);
    const profile = this.buildProfile();
    const budgetConfig = this.buildBudgetConfig();
    const permissions = this.buildPermissions();

    const joinRequest: SocialProxyUpstream = {
      type: 'lobby_join',
      request: {
        auth: {
          lobsterId: this.lobsterId,
          publicKey: this.keypair.publicKey,
          signature,
        },
        profile,
        budgetConfig,
        permissions,
      },
    };

    this.send(joinRequest);
  }

  private handleLobbyResult(result: { success: boolean; reason?: string; sessionToken?: string; scene?: Scene }): void {
    if (result.success && result.sessionToken && result.scene) {
      this.sessionToken = result.sessionToken;
      this.scene = result.scene;
      this.reconnectAttempt = 0;
      this.setState('joined');
      this.startHeartbeat();
      this.emit('joined');
    } else {
      this.emit('error', new Error(result.reason ?? 'Join failed'));
    }
  }

  private buildProfile(): SocialProfile {
    return {
      lobsterId: this.lobsterId,
      displayName: this.config.displayName,
      avatar: '',
      bio: this.config.bio ?? '',
      skillTags: this.config.skills ?? [],
      personalitySnippet: '',
      status: 'online',
      partition: 'public',
    };
  }

  private buildBudgetConfig(): BudgetConfig {
    return {
      daily: {
        maxTokens: this.config.dailyTokenLimit ?? 50000,
        maxSessions: 20,
      },
      perSession: {
        maxTokens: this.config.sessionTokenLimit ?? 5000,
        maxTurns: 20,
      },
    };
  }

  private buildPermissions(): SocialPermissionPolicy {
    const preset = this.config.permissionPreset ?? 'selective';
    const base = { ...DEFAULT_SOCIAL_PERMISSION_POLICY };

    if (preset === 'open') {
      base.maxConcurrentDialogues = 5;
    } else if (preset === 'private') {
      base.maxConcurrentDialogues = 1;
    }

    return base;
  }

  private send(msg: SocialProxyUpstream): void {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private ensureJoined(): void {
    if (this.state !== 'joined') {
      throw new Error('Not connected');
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_INITIAL_DELAY_MS * Math.pow(RECONNECT_BACKOFF_MULTIPLIER, this.reconnectAttempt),
      RECONNECT_MAX_BACKOFF_MS,
    );
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionalDisconnect) {
        this.setState('connecting');
        this.createConnection();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.state === 'joined') {
        this.send({
          type: 'budget_report',
          usage: {
            daily: { tokensUsed: 0, sessionsUsed: 0 },
          },
        });
      }
    }, PLUGIN_HEARTBEAT_INTERVAL_MS);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
