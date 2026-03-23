import type { AgentMessage, Meeting, MessageType } from '@lobster-world/protocol';
import { eq } from 'drizzle-orm';
import type { Database } from '../connection.js';
import { meetings as meetingsTable, agentMessages } from '../schema.js';

export interface CommsRepository {
  saveMessage(msg: AgentMessage): Promise<void>;
  getMessages(agentId: string): Promise<AgentMessage[]>;
  getMessagesByType(type: MessageType): Promise<AgentMessage[]>;
  getRecentMessages(count: number): Promise<AgentMessage[]>;
  getAllMessages(): Promise<AgentMessage[]>;
  messageCount(): Promise<number>;

  saveMeeting(meeting: Meeting): Promise<void>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  updateMeeting(id: string, meeting: Meeting): Promise<void>;
  getActiveMeetings(): Promise<Meeting[]>;
  meetingCount(): Promise<number>;
}

export class InMemoryCommsRepo implements CommsRepository {
  private messages: AgentMessage[] = [];
  private meetings: Map<string, Meeting> = new Map();

  async saveMessage(msg: AgentMessage): Promise<void> {
    this.messages.push(msg);
  }

  async getMessages(agentId: string): Promise<AgentMessage[]> {
    return this.messages.filter(
      (m) => m.to === agentId || m.to === 'all' || m.from === agentId,
    );
  }

  async getMessagesByType(type: MessageType): Promise<AgentMessage[]> {
    return this.messages.filter((m) => m.type === type);
  }

  async getRecentMessages(count: number): Promise<AgentMessage[]> {
    return this.messages.slice(-count);
  }

  async getAllMessages(): Promise<AgentMessage[]> {
    return [...this.messages];
  }

  async messageCount(): Promise<number> {
    return this.messages.length;
  }

  async saveMeeting(meeting: Meeting): Promise<void> {
    this.meetings.set(meeting.id, meeting);
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async updateMeeting(id: string, meeting: Meeting): Promise<void> {
    this.meetings.set(id, meeting);
  }

  async getActiveMeetings(): Promise<Meeting[]> {
    return [...this.meetings.values()].filter((m) => m.status === 'active');
  }

  async meetingCount(): Promise<number> {
    return this.meetings.size;
  }
}

function rowToMessage(row: typeof agentMessages.$inferSelect): AgentMessage {
  const msg: AgentMessage = {
    id: row.id,
    from: row.fromId,
    to: row.toId,
    type: row.type as MessageType,
    content: row.content,
    timestamp: row.timestamp,
  };
  if (row.context) {
    msg.context = row.context as { taskId?: string; docId?: string };
  }
  return msg;
}

function rowToMeeting(row: typeof meetingsTable.$inferSelect): Meeting {
  return {
    id: row.id,
    topic: row.topic,
    participants: (row.participants as string[]) ?? [],
    messages: (row.messages as AgentMessage[]) ?? [],
    decisions: (row.decisions as string[]) ?? [],
    status: row.status as Meeting['status'],
  };
}

export class PgCommsRepo implements CommsRepository {
  constructor(private db: Database) {}

  async saveMessage(msg: AgentMessage): Promise<void> {
    await this.db.insert(agentMessages).values({
      id: msg.id,
      fromId: msg.from,
      toId: typeof msg.to === 'string' ? msg.to : msg.to,
      type: msg.type,
      content: msg.content,
      context: msg.context ?? null,
      timestamp: msg.timestamp,
    });
  }

  async getMessages(agentId: string): Promise<AgentMessage[]> {
    const rows = await this.db.select().from(agentMessages);
    return rows.map(rowToMessage).filter(
      (m) => m.to === agentId || m.to === 'all' || m.from === agentId,
    );
  }

  async getMessagesByType(type: MessageType): Promise<AgentMessage[]> {
    const rows = await this.db.select().from(agentMessages).where(eq(agentMessages.type, type));
    return rows.map(rowToMessage);
  }

  async getRecentMessages(count: number): Promise<AgentMessage[]> {
    const rows = await this.db.select().from(agentMessages).orderBy(agentMessages.timestamp).limit(count);
    return rows.map(rowToMessage);
  }

  async getAllMessages(): Promise<AgentMessage[]> {
    const rows = await this.db.select().from(agentMessages);
    return rows.map(rowToMessage);
  }

  async messageCount(): Promise<number> {
    const rows = await this.db.select().from(agentMessages);
    return rows.length;
  }

  async saveMeeting(meeting: Meeting): Promise<void> {
    await this.db.insert(meetingsTable).values({
      id: meeting.id,
      topic: meeting.topic,
      participants: meeting.participants,
      messages: meeting.messages as typeof meetingsTable.$inferInsert.messages,
      decisions: meeting.decisions,
      status: meeting.status,
    });
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [row] = await this.db.select().from(meetingsTable).where(eq(meetingsTable.id, id));
    return row ? rowToMeeting(row) : undefined;
  }

  async updateMeeting(id: string, meeting: Meeting): Promise<void> {
    await this.db.update(meetingsTable).set({
      participants: meeting.participants,
      messages: meeting.messages as typeof meetingsTable.$inferInsert.messages,
      decisions: meeting.decisions,
      status: meeting.status,
    }).where(eq(meetingsTable.id, id));
  }

  async getActiveMeetings(): Promise<Meeting[]> {
    const rows = await this.db.select().from(meetingsTable).where(eq(meetingsTable.status, 'active'));
    return rows.map(rowToMeeting);
  }

  async meetingCount(): Promise<number> {
    const rows = await this.db.select().from(meetingsTable);
    return rows.length;
  }
}
