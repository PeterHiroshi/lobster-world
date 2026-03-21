import type WebSocket from 'ws';
import type {
  SocialProxyUpstream,
  SocialProxyDownstream,
  LobsterState,
} from '@lobster-world/protocol';
import type { AuthManager } from '../engine/auth.js';
import type { LobbyManager } from '../engine/lobby.js';
import type { ConsentManager } from '../engine/consent.js';
import type { BudgetEnforcer } from '../engine/budget-enforcer.js';
import type { ConnectionManager } from './connection-manager.js';
import type { SceneEngine } from '../engine/scene.js';
import type { LobsterRegistry } from '../engine/registry.js';
import type { AuditLog } from '../engine/audit-log.js';

export interface SocialLobbyHandlerDeps {
  auth: AuthManager;
  lobby: LobbyManager;
  consent: ConsentManager;
  budgetEnforcer: BudgetEnforcer;
  connections: ConnectionManager;
  scene: SceneEngine;
  registry: LobsterRegistry;
  auditLog?: AuditLog;
}

interface PendingAuth {
  nonce: string;
  timestamp: number;
}

export function createSocialLobbyHandler(deps: SocialLobbyHandlerDeps) {
  const { auth, lobby, consent, budgetEnforcer, connections, scene, registry, auditLog } = deps;

  const wsToLobsterId = new WeakMap<WebSocket, string>();
  const pendingAuths = new WeakMap<WebSocket, PendingAuth>();

  function sendProxy(ws: WebSocket, event: SocialProxyDownstream): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  function handleLobbyJoin(
    ws: WebSocket,
    event: Extract<SocialProxyUpstream, { type: 'lobby_join' }>,
  ): void {
    const { request } = event;
    const { auth: authReq, profile, budgetConfig, permissions } = request;

    // If no signature, send a challenge
    if (!authReq.signature) {
      const challenge = auth.createChallenge();
      pendingAuths.set(ws, { nonce: challenge.nonce, timestamp: challenge.timestamp });
      sendProxy(ws, { type: 'auth_challenge', challenge });
      return;
    }

    // Verify signature
    const pending = pendingAuths.get(ws);
    if (!pending) {
      sendProxy(ws, {
        type: 'lobby_result',
        result: { success: false, reason: 'No auth challenge pending' },
      });
      return;
    }

    const authResult = auth.verifyAuthResponse(authReq, pending.nonce);
    pendingAuths.delete(ws);

    if (!authResult.valid) {
      sendProxy(ws, {
        type: 'lobby_result',
        result: { success: false, reason: authResult.reason ?? 'Auth failed' },
      });
      return;
    }

    // Process lobby join
    const joinResult = lobby.processJoinRequest(profile, budgetConfig, permissions);
    if (!joinResult.success) {
      sendProxy(ws, { type: 'lobby_result', result: joinResult });
      return;
    }

    // Register in system
    const publicProfile = {
      id: profile.lobsterId,
      name: profile.displayName,
      color: '#3B82F6', // default, will get from profile
      skills: profile.skillTags,
      bio: profile.bio,
    };

    const lobsterState = registry.register(publicProfile, joinResult.sessionToken ?? '');
    connections.addLobster(ws, profile.lobsterId, publicProfile);
    scene.addLobster(lobsterState);
    wsToLobsterId.set(ws, profile.lobsterId);

    // Register budget
    budgetEnforcer.registerLobster(profile.lobsterId, budgetConfig);

    // Send success
    sendProxy(ws, {
      type: 'lobby_result',
      result: {
        success: true,
        sessionToken: joinResult.sessionToken,
        scene: scene.getScene(),
      },
    });

    // Broadcast join to viewers
    connections.broadcastToViewers({
      type: 'lobster_join',
      lobster: lobsterState,
    });

    auditLog?.log('lobster_join', [profile.lobsterId], `${profile.displayName} joined via social proxy`);
  }

  function handleDialogueResponse(
    lobsterId: string,
    event: Extract<SocialProxyUpstream, { type: 'dialogue_response' }>,
  ): void {
    const { response } = event;
    const resolved = consent.resolveConsent(response.sessionId, response.accepted, response.reason);
    if (!resolved) return;

    const pending = consent.getPendingConsent(response.sessionId);
    if (!pending) {
      // Consent was already resolved (auto-accept or timeout)
      return;
    }
  }

  function handleDialogueMessage(
    lobsterId: string,
    event: Extract<SocialProxyUpstream, { type: 'dialogue_message' }>,
  ): void {
    // Track budget
    const tokens = Math.ceil(event.content.split(/\s+/).length * 1.3);
    budgetEnforcer.addTokens(lobsterId, event.sessionId, tokens);
    budgetEnforcer.addTurn(lobsterId, event.sessionId);

    // Check budget exceeded
    if (budgetEnforcer.isSessionBudgetExceeded(lobsterId, event.sessionId)) {
      const ws = connections.getLobster(lobsterId)?.ws;
      if (ws) {
        sendProxy(ws as WebSocket, {
          type: 'dialogue_ended',
          sessionId: event.sessionId,
          reason: 'budget_exceeded',
        });
      }
      return;
    }
  }

  function handleStateUpdate(
    lobsterId: string,
    event: Extract<SocialProxyUpstream, { type: 'state_update' }>,
  ): void {
    const updated = registry.updateState(lobsterId, event.state);
    if (updated) {
      scene.updateLobster(lobsterId, event.state);
      connections.broadcastToViewers({
        type: 'lobster_update',
        lobsterId,
        delta: event.state,
      });
    }
  }

  // Budget warning handler
  budgetEnforcer.onBudgetWarning((warning) => {
    const conn = connections.getLobster(warning.lobsterId);
    if (conn) {
      sendProxy(conn.ws as WebSocket, {
        type: 'budget_warning',
        level: warning.level,
        tokensUsed: warning.tokensUsed,
        tokensLimit: warning.tokensLimit,
        sessionsUsed: warning.sessionsUsed,
        sessionsLimit: warning.sessionsLimit,
      });
    }
  });

  return {
    handleConnection(ws: WebSocket): void {
      ws.on('message', (data: Buffer | string) => {
        let event: SocialProxyUpstream;
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf-8');
          event = JSON.parse(raw) as SocialProxyUpstream;
        } catch {
          sendProxy(ws, {
            type: 'lobby_result',
            result: { success: false, reason: 'Invalid JSON' },
          });
          return;
        }

        const lobsterId = wsToLobsterId.get(ws);

        if (!lobsterId) {
          if (event.type !== 'lobby_join') {
            sendProxy(ws, {
              type: 'lobby_result',
              result: { success: false, reason: 'Must join lobby first' },
            });
            return;
          }
          handleLobbyJoin(ws, event);
          return;
        }

        switch (event.type) {
          case 'lobby_join':
            sendProxy(ws, {
              type: 'lobby_result',
              result: { success: false, reason: 'Already joined' },
            });
            break;
          case 'dialogue_response':
            handleDialogueResponse(lobsterId, event);
            break;
          case 'dialogue_message':
            handleDialogueMessage(lobsterId, event);
            break;
          case 'state_update':
            handleStateUpdate(lobsterId, event);
            break;
          case 'budget_report':
            // Client-side budget report — acknowledged but server tracks independently
            break;
        }
      });
    },
  };
}
