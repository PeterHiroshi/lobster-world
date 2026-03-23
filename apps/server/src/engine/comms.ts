import type { AgentMessage, Meeting, MessageType } from '@lobster-world/protocol';
import type { CommsRepository } from '../db/repositories/comms-repo.js';
import { InMemoryCommsRepo } from '../db/repositories/comms-repo.js';

export class CommsEngine {
  private repo: CommsRepository;
  private nextMessageId = 1;
  private nextMeetingId = 1;

  constructor(repo?: CommsRepository) {
    this.repo = repo ?? new InMemoryCommsRepo();
  }

  async sendMessage(
    from: string,
    to: string | 'all',
    type: MessageType,
    content: string,
    context?: { taskId?: string; docId?: string },
  ): Promise<AgentMessage> {
    const msg: AgentMessage = {
      id: `msg-${this.nextMessageId++}`,
      from,
      to,
      type,
      content,
      timestamp: Date.now(),
      ...(context ? { context } : {}),
    };
    await this.repo.saveMessage(msg);
    return msg;
  }

  async getMessages(agentId: string): Promise<AgentMessage[]> {
    return this.repo.getMessages(agentId);
  }

  async getMessagesByType(type: MessageType): Promise<AgentMessage[]> {
    return this.repo.getMessagesByType(type);
  }

  async getRecentMessages(count: number): Promise<AgentMessage[]> {
    return this.repo.getRecentMessages(count);
  }

  async createMeeting(topic: string, participants: string[]): Promise<Meeting> {
    const meeting: Meeting = {
      id: `meeting-${this.nextMeetingId++}`,
      topic,
      participants,
      messages: [],
      decisions: [],
      status: 'active',
    };
    await this.repo.saveMeeting(meeting);
    return meeting;
  }

  async addMeetingMessage(
    meetingId: string,
    from: string,
    content: string,
  ): Promise<AgentMessage | undefined> {
    const meeting = await this.repo.getMeeting(meetingId);
    if (!meeting || meeting.status === 'ended') return undefined;

    const msg: AgentMessage = {
      id: `msg-${this.nextMessageId++}`,
      from,
      to: meetingId,
      type: 'meeting',
      content,
      timestamp: Date.now(),
    };
    meeting.messages.push(msg);
    await this.repo.updateMeeting(meetingId, meeting);
    await this.repo.saveMessage(msg);
    return msg;
  }

  async addDecision(meetingId: string, decision: string): Promise<boolean> {
    const meeting = await this.repo.getMeeting(meetingId);
    if (!meeting || meeting.status === 'ended') return false;
    meeting.decisions.push(decision);
    await this.repo.updateMeeting(meetingId, meeting);
    return true;
  }

  async endMeeting(meetingId: string): Promise<Meeting | undefined> {
    const meeting = await this.repo.getMeeting(meetingId);
    if (!meeting) return undefined;
    meeting.status = 'ended';
    await this.repo.updateMeeting(meetingId, meeting);
    return meeting;
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.repo.getMeeting(id);
  }

  async getActiveMeetings(): Promise<Meeting[]> {
    return this.repo.getActiveMeetings();
  }

  async broadcast(fromId: string, content: string): Promise<AgentMessage> {
    return this.sendMessage(fromId, 'all', 'broadcast', content);
  }

  async getMessageCount(): Promise<number> {
    return this.repo.messageCount();
  }

  async getMeetingCount(): Promise<number> {
    return this.repo.meetingCount();
  }
}
