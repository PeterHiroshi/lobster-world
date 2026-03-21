import nacl from 'tweetnacl';
import type {
  LobbyProfile,
  SocialProfile,
  BudgetConfig,
  SocialPermissionPolicy,
  SocialProxyUpstream,
  SocialProxyDownstream,
  LobbyJoinRequest,
  BudgetStatus,
  PermissionRequest,
} from '@lobster-world/protocol';
import {
  DEFAULT_BUDGET_CONFIG,
  DEFAULT_SOCIAL_PERMISSION_POLICY,
  BUDGET_WARNING_THRESHOLD,
  BUDGET_CRITICAL_THRESHOLD,
} from '@lobster-world/protocol';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export interface DemoSocialProxyCallbacks {
  onJoined: (sessionToken: string) => void;
  onError: (error: string) => void;
  onBudgetStatus: (status: BudgetStatus) => void;
  onPermissionRequest: (request: PermissionRequest) => void;
  onDialogueInvitation: (sessionId: string, fromName: string, fromColor: string, intent: string) => void;
  onDialogueMessage: (sessionId: string, from: string, content: string, turnNumber: number) => void;
  onDialogueEnded: (sessionId: string, reason: string) => void;
}

const BLOCKED_PATTERNS = [
  /\bsk-[a-zA-Z0-9]{10,}\b/g,
  /\b(?:password|passwd|pwd)\s*[=:]\s*\S+/gi,
];

export class DemoSocialProxy {
  private publicKey: string = '';
  private secretKey: string = '';
  private lobsterId: string = '';
  private profile: SocialProfile | null = null;
  private budgetConfig: BudgetConfig = { ...DEFAULT_BUDGET_CONFIG };
  private permissions: SocialPermissionPolicy = { ...DEFAULT_SOCIAL_PERMISSION_POLICY };
  private ws: WebSocket | null = null;
  private callbacks: DemoSocialProxyCallbacks;
  private dailyTokensUsed = 0;
  private dailySessionsUsed = 0;
  private sessionTokensUsed = 0;
  private activeSessionId: string | null = null;

  constructor(callbacks: DemoSocialProxyCallbacks) {
    this.callbacks = callbacks;
    this.generateKeypair();
  }

  private generateKeypair(): void {
    const kp = nacl.sign.keyPair();
    this.publicKey = toHex(kp.publicKey);
    this.secretKey = toHex(kp.secretKey);
    this.lobsterId = `lobster-${this.publicKey.slice(0, 8)}`;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getLobsterId(): string {
    return this.lobsterId;
  }

  connect(wsUrl: string, lobbyProfile: LobbyProfile): void {
    this.budgetConfig = {
      daily: { maxTokens: lobbyProfile.dailyTokenLimit, maxSessions: 20 },
      perSession: { maxTokens: lobbyProfile.sessionTokenLimit, maxTurns: 20 },
    };

    this.permissions = {
      ...DEFAULT_SOCIAL_PERMISSION_POLICY,
      maxConcurrentDialogues: lobbyProfile.permissionPreset === 'private' ? 0 : 3,
      autoAcceptDialogue: lobbyProfile.permissionPreset === 'open' ? ['*'] : [],
    };

    this.profile = {
      lobsterId: this.lobsterId,
      displayName: lobbyProfile.displayName,
      avatar: '',
      bio: lobbyProfile.bio,
      skillTags: lobbyProfile.skills,
      personalitySnippet: '',
      status: 'online',
      partition: 'public',
    };

    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      this.sendLobbyJoin();
    };
    this.ws.onmessage = (event) => {
      this.handleMessage(event.data as string);
    };
    this.ws.onerror = () => {
      this.callbacks.onError('WebSocket connection error');
    };
    this.ws.onclose = () => {
      this.ws = null;
    };
  }

  private sendLobbyJoin(): void {
    if (!this.profile) return;
    const request: LobbyJoinRequest = {
      auth: {
        lobsterId: this.lobsterId,
        publicKey: this.publicKey,
        signature: '', // Will be filled after challenge
      },
      profile: this.profile,
      budgetConfig: this.budgetConfig,
      permissions: this.permissions,
    };
    this.send({ type: 'lobby_join', request });
  }

  private handleMessage(raw: string): void {
    let event: SocialProxyDownstream;
    try {
      event = JSON.parse(raw) as SocialProxyDownstream;
    } catch {
      return;
    }

    switch (event.type) {
      case 'auth_challenge': {
        const signature = this.signNonce(event.challenge.nonce);
        // Re-send lobby join with signature
        if (this.profile) {
          const request: LobbyJoinRequest = {
            auth: {
              lobsterId: this.lobsterId,
              publicKey: this.publicKey,
              signature,
            },
            profile: this.profile,
            budgetConfig: this.budgetConfig,
            permissions: this.permissions,
          };
          this.send({ type: 'lobby_join', request });
        }
        break;
      }
      case 'lobby_result': {
        if (event.result.success && event.result.sessionToken) {
          this.callbacks.onJoined(event.result.sessionToken);
        } else {
          this.callbacks.onError(event.result.reason ?? 'Join failed');
        }
        break;
      }
      case 'dialogue_invitation': {
        const inv = event.invitation;
        this.callbacks.onDialogueInvitation(
          inv.sessionId,
          inv.from.profile.displayName,
          '#888888',
          inv.intent,
        );
        break;
      }
      case 'dialogue_message': {
        this.sessionTokensUsed += this.estimateTokens(event.content);
        this.dailyTokensUsed += this.estimateTokens(event.content);
        this.emitBudgetStatus();
        this.callbacks.onDialogueMessage(event.sessionId, event.from, event.content, event.turnNumber);
        break;
      }
      case 'dialogue_ended': {
        if (this.activeSessionId === event.sessionId) {
          this.activeSessionId = null;
          this.sessionTokensUsed = 0;
        }
        this.callbacks.onDialogueEnded(event.sessionId, event.reason);
        break;
      }
      case 'budget_warning': {
        this.emitBudgetStatus();
        break;
      }
    }
  }

  private signNonce(nonce: string): string {
    const secretKey = fromHex(this.secretKey);
    const message = new TextEncoder().encode(nonce);
    const signature = nacl.sign.detached(message, secretKey);
    return toHex(signature);
  }

  private send(event: SocialProxyUpstream): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  sendDialogueResponse(sessionId: string, accepted: boolean): void {
    if (accepted) {
      this.activeSessionId = sessionId;
      this.sessionTokensUsed = 0;
      this.dailySessionsUsed++;
    }
    this.send({
      type: 'dialogue_response',
      response: { sessionId, accepted },
    });
  }

  sendMessage(sessionId: string, content: string): void {
    const filtered = this.filterOutput(content);
    const tokens = this.estimateTokens(filtered);
    this.sessionTokensUsed += tokens;
    this.dailyTokensUsed += tokens;
    this.emitBudgetStatus();

    this.send({
      type: 'dialogue_message',
      sessionId,
      content: filtered,
    });
  }

  filterOutput(text: string): string {
    let result = text;
    for (const pattern of BLOCKED_PATTERNS) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }

  isOutputSafe(text: string): boolean {
    for (const pattern of BLOCKED_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) return false;
    }
    return true;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  private emitBudgetStatus(): void {
    this.callbacks.onBudgetStatus({
      dailyTokensUsed: this.dailyTokensUsed,
      dailyTokensLimit: this.budgetConfig.daily.maxTokens,
      dailySessionsUsed: this.dailySessionsUsed,
      dailySessionsLimit: this.budgetConfig.daily.maxSessions,
      activeSessionTokens: this.sessionTokensUsed,
      activeSessionLimit: this.budgetConfig.perSession.maxTokens,
    });
  }

  isDailyBudgetWarning(): boolean {
    return this.dailyTokensUsed / this.budgetConfig.daily.maxTokens >= BUDGET_WARNING_THRESHOLD;
  }

  isDailyBudgetCritical(): boolean {
    return this.dailyTokensUsed / this.budgetConfig.daily.maxTokens >= BUDGET_CRITICAL_THRESHOLD;
  }

  isSessionBudgetExceeded(): boolean {
    return this.sessionTokensUsed > this.budgetConfig.perSession.maxTokens;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
