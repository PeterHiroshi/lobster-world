import type { StateCreator } from 'zustand';
import type { A2AMessageType } from '@lobster-world/protocol';

export interface A2AConnection {
  id: string;
  fromId: string;
  toId: string;
  type: A2AMessageType;
  startTime: number;
}

export interface A2AActivity {
  id: string;
  type: A2AMessageType;
  fromId: string;
  toId: string | string[];
  summary: string;
  timestamp: number;
}

export interface A2ASlice {
  a2aConnections: A2AConnection[];
  a2aActivities: A2AActivity[];
  a2aNotifications: Record<string, number>; // agentId -> unread count
  a2aCollabSessions: string[]; // active collab session IDs

  addA2AConnection: (conn: A2AConnection) => void;
  removeA2AConnection: (id: string) => void;
  addA2AActivity: (activity: A2AActivity) => void;
  incrementNotification: (agentId: string) => void;
  clearNotifications: (agentId: string) => void;
  addCollabSession: (sessionId: string) => void;
  removeCollabSession: (sessionId: string) => void;
}

const MAX_ACTIVITIES = 50;
const CONNECTION_DURATION_MS = 3000;

let nextConnectionId = 1;

export function makeConnectionId(): number {
  return nextConnectionId++;
}

export const createA2ASlice: StateCreator<A2ASlice, [], [], A2ASlice> = (set) => ({
  a2aConnections: [],
  a2aActivities: [],
  a2aNotifications: {},
  a2aCollabSessions: [],

  addA2AConnection: (conn: A2AConnection) => {
    set((state) => ({
      a2aConnections: [...state.a2aConnections, conn],
    }));
    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        a2aConnections: state.a2aConnections.filter((c) => c.id !== conn.id),
      }));
    }, CONNECTION_DURATION_MS);
  },

  removeA2AConnection: (id: string) => {
    set((state) => ({
      a2aConnections: state.a2aConnections.filter((c) => c.id !== id),
    }));
  },

  addA2AActivity: (activity: A2AActivity) => {
    set((state) => ({
      a2aActivities: [...state.a2aActivities.slice(-(MAX_ACTIVITIES - 1)), activity],
    }));
  },

  incrementNotification: (agentId: string) => {
    set((state) => ({
      a2aNotifications: {
        ...state.a2aNotifications,
        [agentId]: (state.a2aNotifications[agentId] ?? 0) + 1,
      },
    }));
  },

  clearNotifications: (agentId: string) => {
    set((state) => {
      const updated = { ...state.a2aNotifications };
      delete updated[agentId];
      return { a2aNotifications: updated };
    });
  },

  addCollabSession: (sessionId: string) => {
    set((state) => ({
      a2aCollabSessions: [...state.a2aCollabSessions, sessionId],
    }));
  },

  removeCollabSession: (sessionId: string) => {
    set((state) => ({
      a2aCollabSessions: state.a2aCollabSessions.filter((s) => s !== sessionId),
    }));
  },
});
