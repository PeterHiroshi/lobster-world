import type { AgentMessage, Meeting, MessageType } from '@lobster-world/protocol';

export class CommsEngine {
  private messages: AgentMessage[] = [];
  private meetings: Map<string, Meeting> = new Map();
  private nextMessageId: number = 1;
  private nextMeetingId: number = 1;

  sendMessage(
    from: string,
    to: string | 'all',
    type: MessageType,
    content: string,
    context?: { taskId?: string; docId?: string },
  ): AgentMessage {
    const msg: AgentMessage = {
      id: `msg-${this.nextMessageId++}`,
      from,
      to,
      type,
      content,
      timestamp: Date.now(),
      ...(context ? { context } : {}),
    };
    this.messages.push(msg);
    return msg;
  }

  getMessages(agentId: string): AgentMessage[] {
    return this.messages.filter(
      (m) => m.to === agentId || m.to === 'all' || m.from === agentId,
    );
  }

  getMessagesByType(type: MessageType): AgentMessage[] {
    return this.messages.filter((m) => m.type === type);
  }

  getRecentMessages(count: number): AgentMessage[] {
    return this.messages.slice(-count);
  }

  createMeeting(topic: string, participants: string[]): Meeting {
    const meeting: Meeting = {
      id: `meeting-${this.nextMeetingId++}`,
      topic,
      participants,
      messages: [],
      decisions: [],
      status: 'active',
    };
    this.meetings.set(meeting.id, meeting);
    return meeting;
  }

  addMeetingMessage(
    meetingId: string,
    from: string,
    content: string,
  ): AgentMessage | undefined {
    const meeting = this.meetings.get(meetingId);
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
    this.messages.push(msg);
    return msg;
  }

  addDecision(meetingId: string, decision: string): boolean {
    const meeting = this.meetings.get(meetingId);
    if (!meeting || meeting.status === 'ended') return false;
    meeting.decisions.push(decision);
    return true;
  }

  endMeeting(meetingId: string): Meeting | undefined {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return undefined;
    meeting.status = 'ended';
    return meeting;
  }

  getMeeting(id: string): Meeting | undefined {
    return this.meetings.get(id);
  }

  getActiveMeetings(): Meeting[] {
    return [...this.meetings.values()].filter((m) => m.status === 'active');
  }

  broadcast(fromId: string, content: string): AgentMessage {
    return this.sendMessage(fromId, 'all', 'broadcast', content);
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  getMeetingCount(): number {
    return this.meetings.size;
  }
}
