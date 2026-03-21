import type WebSocket from 'ws';
import type {
  UpstreamEvent,
  DownstreamEvent,
  LobsterState,
} from '@lobster-world/protocol';
import type { ConnectionManager } from './connection-manager.js';
import type { LobsterRegistry } from '../engine/registry.js';
import type { SceneEngine } from '../engine/scene.js';
import type { DialogueRouter } from '../engine/dialogue.js';
import type { CircuitBreaker } from '../engine/circuit-breaker.js';
import type { AuditLog } from '../engine/audit-log.js';

export interface LobsterHandlerDeps {
  connections: ConnectionManager;
  registry: LobsterRegistry;
  scene: SceneEngine;
  dialogue: DialogueRouter;
  circuitBreaker: CircuitBreaker;
  auditLog?: AuditLog;
}

export function createLobsterHandler(deps: LobsterHandlerDeps) {
  const { connections, registry, scene, dialogue, circuitBreaker, auditLog } = deps;

  const wsToLobsterId = new WeakMap<WebSocket, string>();

  function sendError(ws: WebSocket, code: string, message: string): void {
    const event: DownstreamEvent = { type: 'error', code, message };
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  function handleRegister(
    ws: WebSocket,
    event: Extract<UpstreamEvent, { type: 'register' }>,
  ): void {
    const { profile, token } = event;

    if (!profile.id || !profile.name || !profile.color) {
      sendError(ws, 'INVALID_PROFILE', 'Profile must include id, name, and color');
      return;
    }

    if (scene.isFull()) {
      sendError(ws, 'SCENE_FULL', 'Scene is at capacity');
      return;
    }

    if (registry.isRegistered(profile.id)) {
      sendError(ws, 'ALREADY_REGISTERED', 'Lobster is already registered');
      return;
    }

    const state = registry.register(profile, token);
    connections.addLobster(ws, profile.id, profile);
    scene.addLobster(state);
    wsToLobsterId.set(ws, profile.id);

    const registered: DownstreamEvent = {
      type: 'registered',
      lobsterId: profile.id,
      scene: scene.getScene(),
    };
    connections.sendToLobster(profile.id, registered);

    connections.broadcastToViewers({
      type: 'lobster_join',
      lobster: state,
    });

    auditLog?.log('lobster_join', [profile.id], `${profile.name} joined the scene`);
  }

  function handleStateUpdate(
    lobsterId: string,
    event: Extract<UpstreamEvent, { type: 'state_update' }>,
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

  function handleActivityUpdate(
    lobsterId: string,
    event: Extract<UpstreamEvent, { type: 'activity_update' }>,
  ): void {
    const delta: Partial<LobsterState> = { activity: event.activity };
    if (event.mood !== undefined) {
      delta.mood = event.mood;
    }
    registry.updateState(lobsterId, delta);
    scene.updateLobster(lobsterId, delta);
    connections.broadcastToViewers({
      type: 'lobster_update',
      lobsterId,
      delta,
    });
  }

  function handleDialogueRequest(
    lobsterId: string,
    event: Extract<UpstreamEvent, { type: 'dialogue_request' }>,
  ): void {
    const initiatorCheck = circuitBreaker.canStartSession(lobsterId);
    if (!initiatorCheck.allowed) {
      connections.sendToLobster(lobsterId, {
        type: 'error',
        code: 'CIRCUIT_BREAKER',
        message: initiatorCheck.reason ?? 'Cannot start session',
      });
      return;
    }

    const targetCheck = circuitBreaker.canStartSession(event.targetId);
    if (!targetCheck.allowed) {
      connections.sendToLobster(lobsterId, {
        type: 'error',
        code: 'TARGET_UNAVAILABLE',
        message: targetCheck.reason ?? 'Target cannot start session',
      });
      return;
    }

    if (!registry.isRegistered(event.targetId)) {
      connections.sendToLobster(lobsterId, {
        type: 'error',
        code: 'TARGET_NOT_FOUND',
        message: 'Target lobster not found',
      });
      return;
    }

    const session = dialogue.createSession(
      lobsterId,
      event.targetId,
      event.intent,
      event.dialogueType,
    );

    circuitBreaker.trackSessionStart(lobsterId, session.id);
    circuitBreaker.trackSessionStart(event.targetId, session.id);

    const initiatorProfile = registry.getLobster(lobsterId)?.profile;
    if (!initiatorProfile) {
      return;
    }

    connections.sendToLobster(event.targetId, {
      type: 'dialogue_invite',
      sessionId: session.id,
      from: initiatorProfile,
      intent: event.intent,
      dialogueType: event.dialogueType,
    });

    auditLog?.log('dialogue_start', [lobsterId, event.targetId], `Dialogue started: ${event.intent}`);

    // Broadcast dialogue_start to viewers
    const targetProfile = registry.getLobster(event.targetId)?.profile;
    connections.broadcastToViewers({
      type: 'dialogue_start',
      sessionId: session.id,
      participants: session.participants,
      participantNames: [initiatorProfile.name, targetProfile?.name ?? 'Unknown'],
      participantColors: [initiatorProfile.color, targetProfile?.color ?? '#888888'],
      intent: event.intent,
    });
  }

  function handleDialogueAccept(
    _lobsterId: string,
    _event: Extract<UpstreamEvent, { type: 'dialogue_accept' }>,
  ): void {
    // Acknowledge — session is already active upon creation
  }

  function handleDialogueReject(
    lobsterId: string,
    event: Extract<UpstreamEvent, { type: 'dialogue_reject' }>,
  ): void {
    const session = dialogue.getSession(event.sessionId);
    if (!session) {
      return;
    }

    const stats = dialogue.endSession(event.sessionId, 'user_ended');
    if (!stats) {
      return;
    }

    for (const participantId of session.participants) {
      circuitBreaker.trackSessionEnd(participantId, event.sessionId, false);
    }

    const initiatorId = session.participants.find((id) => id !== lobsterId);
    if (initiatorId) {
      connections.sendToLobster(initiatorId, {
        type: 'dialogue_ended',
        sessionId: event.sessionId,
        reason: event.reason ?? 'rejected',
        stats,
      });
    }
  }

  function handleDialogueMessage(
    lobsterId: string,
    event: Extract<UpstreamEvent, { type: 'dialogue_message' }>,
  ): void {
    const session = dialogue.getSession(event.sessionId);
    if (!session || session.status !== 'active') {
      sendError(
        connections.getLobster(lobsterId)?.ws as WebSocket,
        'SESSION_NOT_FOUND',
        'Dialogue session not found or not active',
      );
      return;
    }

    const sessionCheck = circuitBreaker.checkSession(session);
    if (!sessionCheck.allowed) {
      const stats = dialogue.endSession(event.sessionId, 'circuit_breaker');
      if (stats) {
        for (const participantId of session.participants) {
          circuitBreaker.trackSessionEnd(participantId, event.sessionId, true);
          connections.sendToLobster(participantId, {
            type: 'dialogue_ended',
            sessionId: event.sessionId,
            reason: sessionCheck.reason ?? 'circuit_breaker',
            stats,
          });
        }
        auditLog?.log('circuit_breaker_triggered', session.participants, `Session killed: ${sessionCheck.reason}`);
        connections.broadcastToViewers({
          type: 'dialogue_end',
          sessionId: event.sessionId,
          reason: sessionCheck.reason ?? 'circuit_breaker',
        });
      }
      return;
    }

    const messageCheck = circuitBreaker.checkMessage(lobsterId, event.content);
    if (!messageCheck.allowed) {
      const stats = dialogue.endSession(event.sessionId, 'circuit_breaker');
      if (stats) {
        for (const participantId of session.participants) {
          circuitBreaker.trackSessionEnd(participantId, event.sessionId, true);
          connections.sendToLobster(participantId, {
            type: 'dialogue_ended',
            sessionId: event.sessionId,
            reason: messageCheck.reason ?? 'circuit_breaker',
            stats,
          });
        }
        auditLog?.log('circuit_breaker_triggered', session.participants, `Repeat detected: ${messageCheck.reason}`);
        connections.broadcastToViewers({
          type: 'dialogue_end',
          sessionId: event.sessionId,
          reason: messageCheck.reason ?? 'circuit_breaker',
        });
      }
      return;
    }

    const message = dialogue.addMessage(event.sessionId, lobsterId, event.content);
    if (!message) {
      return;
    }

    const recipientId = session.participants.find((id) => id !== lobsterId);
    if (recipientId) {
      connections.sendToLobster(recipientId, {
        type: 'dialogue_message',
        sessionId: event.sessionId,
        from: lobsterId,
        content: event.content,
        turnNumber: message.turnNumber,
      });
    }

    connections.broadcastToViewers({
      type: 'dialogue_bubble',
      lobsterIds: session.participants,
      preview: event.content.slice(0, 50),
    });

    // Broadcast dialogue_msg to viewers
    const senderProfile = registry.getLobster(lobsterId)?.profile;
    connections.broadcastToViewers({
      type: 'dialogue_msg',
      sessionId: event.sessionId,
      fromId: lobsterId,
      fromName: senderProfile?.name ?? 'Unknown',
      fromColor: senderProfile?.color ?? '#888888',
      content: event.content,
      turnNumber: message.turnNumber,
    });

    auditLog?.log('dialogue_message', [lobsterId], `Turn ${message.turnNumber}: ${event.content.slice(0, 80)}`);
  }

  function handleDialogueEnd(
    lobsterId: string,
    event: Extract<UpstreamEvent, { type: 'dialogue_end' }>,
  ): void {
    const session = dialogue.getSession(event.sessionId);
    if (!session) {
      return;
    }

    const stats = dialogue.endSession(event.sessionId, 'user_ended');
    if (!stats) {
      return;
    }

    for (const participantId of session.participants) {
      circuitBreaker.trackSessionEnd(participantId, event.sessionId, false);
      connections.sendToLobster(participantId, {
        type: 'dialogue_ended',
        sessionId: event.sessionId,
        reason: event.reason,
        stats,
      });
    }

    auditLog?.log('dialogue_end', session.participants, `Dialogue ended: ${event.reason}`);

    connections.broadcastToViewers({
      type: 'dialogue_end',
      sessionId: event.sessionId,
      reason: event.reason,
    });
  }

  function handleEmote(
    lobsterId: string,
    event: Extract<UpstreamEvent, { type: 'emote' }>,
  ): void {
    const animationMap: Record<string, LobsterState['animation']> = {
      wave: 'waving',
      thumbsup: 'celebrating',
      laugh: 'celebrating',
      think: 'thinking',
      shrug: 'idle',
      clap: 'celebrating',
      dance: 'celebrating',
    };

    const animation = animationMap[event.emote] ?? 'idle';
    scene.updateLobster(lobsterId, { animation });
    registry.updateState(lobsterId, { animation });

    connections.broadcastToViewers({
      type: 'lobster_update',
      lobsterId,
      delta: { animation },
    });
  }

  // Register disconnect handler
  connections.onLobsterDisconnect((lobsterId: string) => {
    const lobster = registry.getLobster(lobsterId);
    auditLog?.log('lobster_leave', [lobsterId], `${lobster?.profile.name ?? lobsterId} left the scene`);

    registry.setStatus(lobsterId, 'offline');
    scene.removeLobster(lobsterId);

    const endedSessionIds = dialogue.cleanupDisconnected(lobsterId);

    for (const sessionId of endedSessionIds) {
      const session = dialogue.getSession(sessionId);
      if (session) {
        const otherParticipant = session.participants.find((id) => id !== lobsterId);
        if (otherParticipant) {
          circuitBreaker.trackSessionEnd(otherParticipant, sessionId, false);
          connections.sendToLobster(otherParticipant, {
            type: 'dialogue_ended',
            sessionId,
            reason: 'participant_disconnected',
            stats: {
              totalTurns: session.turnsUsed,
              totalTokens: session.tokensUsed,
              duration: Date.now() - session.startedAt,
              endReason: 'user_ended',
            },
          });
        }
      }
      circuitBreaker.trackSessionEnd(lobsterId, sessionId, false);
    }

    circuitBreaker.clearHistory(lobsterId);

    connections.broadcastToViewers({
      type: 'lobster_leave',
      lobsterId,
    });
  });

  return {
    handleConnection(ws: WebSocket): void {
      ws.on('message', (data: Buffer | string) => {
        let event: UpstreamEvent;
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf-8');
          event = JSON.parse(raw) as UpstreamEvent;
        } catch {
          sendError(ws, 'INVALID_JSON', 'Could not parse message as JSON');
          return;
        }

        const lobsterId = wsToLobsterId.get(ws);

        if (!lobsterId) {
          // First message must be register
          if (event.type !== 'register') {
            sendError(ws, 'NOT_REGISTERED', 'First message must be register');
            return;
          }
          handleRegister(ws, event);
          return;
        }

        switch (event.type) {
          case 'register':
            sendError(ws, 'ALREADY_REGISTERED', 'Already registered');
            break;
          case 'heartbeat':
            // No-op — heartbeat is handled by connection manager pong
            break;
          case 'state_update':
            handleStateUpdate(lobsterId, event);
            break;
          case 'activity_update':
            handleActivityUpdate(lobsterId, event);
            break;
          case 'dialogue_request':
            handleDialogueRequest(lobsterId, event);
            break;
          case 'dialogue_accept':
            handleDialogueAccept(lobsterId, event);
            break;
          case 'dialogue_reject':
            handleDialogueReject(lobsterId, event);
            break;
          case 'dialogue_message':
            handleDialogueMessage(lobsterId, event);
            break;
          case 'dialogue_end':
            handleDialogueEnd(lobsterId, event);
            break;
          case 'emote':
            handleEmote(lobsterId, event);
            break;
        }
      });
    },

    handleMessage(ws: WebSocket, lobsterId: string, event: UpstreamEvent): void {
      wsToLobsterId.set(ws, lobsterId);
      switch (event.type) {
        case 'register':
          handleRegister(ws, event);
          break;
        case 'heartbeat':
          break;
        case 'state_update':
          handleStateUpdate(lobsterId, event);
          break;
        case 'activity_update':
          handleActivityUpdate(lobsterId, event);
          break;
        case 'dialogue_request':
          handleDialogueRequest(lobsterId, event);
          break;
        case 'dialogue_accept':
          handleDialogueAccept(lobsterId, event);
          break;
        case 'dialogue_reject':
          handleDialogueReject(lobsterId, event);
          break;
        case 'dialogue_message':
          handleDialogueMessage(lobsterId, event);
          break;
        case 'dialogue_end':
          handleDialogueEnd(lobsterId, event);
          break;
        case 'emote':
          handleEmote(lobsterId, event);
          break;
      }
    },
  };
}
