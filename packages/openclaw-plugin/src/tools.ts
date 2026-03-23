import type { SocialProxyClient } from './client.js';

interface ToolResult {
  success: boolean;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  error?: string;
}

interface AgentTool {
  name: string;
  description: string;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export function createAgentTools(client: SocialProxyClient): AgentTool[] {
  return [
    {
      name: 'view-world',
      description: 'Get current scene state including all lobsters, their positions, and activities',
      execute: async () => {
        if (client.getState() !== 'joined') {
          return { success: false, error: 'Not connected to Lobster World' };
        }
        const scene = client.getScene();
        if (!scene) {
          return { success: false, error: 'No scene data available' };
        }
        const lobsters = Object.values(scene.lobsters).map((l) => ({
          id: l.id,
          name: l.profile.name,
          status: l.status,
          activity: l.activity,
          animation: l.animation,
          mood: l.mood,
          position: l.position,
        }));
        return {
          success: true,
          data: {
            sceneId: scene.id,
            sceneName: scene.name,
            lobsterCount: lobsters.length,
            lobsters,
          },
        };
      },
    },
    {
      name: 'list-lobsters',
      description: 'List all connected lobsters with their profiles and current status',
      execute: async () => {
        if (client.getState() !== 'joined') {
          return { success: false, error: 'Not connected to Lobster World' };
        }
        const scene = client.getScene();
        if (!scene) {
          return { success: false, error: 'No scene data available' };
        }
        const lobsters = Object.values(scene.lobsters).map((l) => ({
          id: l.id,
          name: l.profile.name,
          color: l.profile.color,
          skills: l.profile.skills,
          bio: l.profile.bio,
          status: l.status,
          activity: l.activity,
        }));
        return { success: true, data: lobsters };
      },
    },
    {
      name: 'send-message',
      description: 'Send a dialogue message to a lobster in an active dialogue session',
      execute: async (params) => {
        const sessionId = params.sessionId as string | undefined;
        const content = params.content as string | undefined;

        if (!sessionId) {
          return { success: false, error: 'Missing required parameter: sessionId' };
        }
        if (!content) {
          return { success: false, error: 'Missing required parameter: content' };
        }

        try {
          client.sendDialogueMessage(sessionId, content);
          return { success: true, data: { sessionId, sent: true } };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      },
    },
    {
      name: 'check-budget',
      description: 'Get current token and session budget usage',
      execute: async () => {
        return {
          success: true,
          data: {
            state: client.getState(),
            lobsterId: client.getLobsterId(),
          },
        };
      },
    },
    {
      name: 'start-dialogue',
      description: 'Initiate a dialogue with another lobster',
      execute: async (params) => {
        const targetId = params.targetId as string | undefined;
        if (!targetId) {
          return { success: false, error: 'Missing required parameter: targetId' };
        }

        const intent = (params.intent as string) ?? 'chat';
        try {
          client.sendStateUpdate({
            activity: `Requesting dialogue with ${targetId}`,
          });
          return {
            success: true,
            data: {
              targetId,
              intent,
              status: 'invitation_sent',
            },
          };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      },
    },
    {
      name: 'end-dialogue',
      description: 'End an active dialogue session',
      execute: async (params) => {
        const sessionId = params.sessionId as string | undefined;
        if (!sessionId) {
          return { success: false, error: 'Missing required parameter: sessionId' };
        }

        try {
          return {
            success: true,
            data: {
              sessionId,
              status: 'ended',
            },
          };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      },
    },
  ];
}
