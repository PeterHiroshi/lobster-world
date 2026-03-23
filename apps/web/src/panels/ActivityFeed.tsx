import { useState, useEffect, useCallback, memo } from 'react';
import type { AuditEvent } from '@lobster-world/protocol';
import { API_BASE_URL } from '../lib/constants';

const POLL_INTERVAL_MS = 5000;
const MAX_DISPLAY_EVENTS = 20;

const EVENT_ICONS: Record<string, string> = {
  lobster_join: '+',
  lobster_leave: '-',
  dialogue_start: '>',
  dialogue_message: '#',
  dialogue_end: 'x',
  circuit_breaker_triggered: '!',
};

const EVENT_COLORS: Record<string, string> = {
  lobster_join: 'text-green-400',
  lobster_leave: 'text-gray-400',
  dialogue_start: 'text-blue-400',
  dialogue_message: 'text-gray-300',
  dialogue_end: 'text-yellow-400',
  circuit_breaker_triggered: 'text-red-400',
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const EventItem = memo(function EventItem({ event }: { event: AuditEvent }) {
  const icon = EVENT_ICONS[event.eventType] ?? '?';
  const colorClass = EVENT_COLORS[event.eventType] ?? 'text-gray-400';

  return (
    <div className="flex gap-2 items-start py-1 px-2 text-xs">
      <span className={`font-mono font-bold ${colorClass} flex-shrink-0 w-3 text-center`}>
        {icon}
      </span>
      <span className="text-gray-500 flex-shrink-0">{formatTime(event.timestamp)}</span>
      <span className="text-gray-300 truncate">{event.details}</span>
    </div>
  );
});

function EventList({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <div className="opacity-50 text-sm p-3 text-center">No events yet</div>;
  }
  return (
    <div className="divide-y divide-gray-300/20 dark:divide-gray-700/50">
      {events.map((event, i) => <EventItem key={`${event.timestamp}-${i}`} event={event} />)}
    </div>
  );
}

export function ActivityFeed({ embedded }: { embedded?: boolean }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/audit?count=${MAX_DISPLAY_EVENTS}`);
      if (res.ok) {
        const data = (await res.json()) as AuditEvent[];
        setEvents(data);
      }
    } catch {
      // Silently fail — feed is non-critical
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  if (embedded) return <EventList events={events} />;

  return (
    <div className="absolute bottom-3 left-3 z-10 w-72 hidden md:block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full panel-glass px-3 py-2 rounded-t-lg text-sm font-medium flex justify-between items-center hover:opacity-90 transition-colors"
      >
        <span>Activity Feed</span>
        <span className="opacity-50 text-xs">
          {events.length} events {isOpen ? '\u25BC' : '\u25B2'}
        </span>
      </button>

      {isOpen && (
        <div className="panel-glass rounded-b-lg max-h-60 overflow-y-auto border-t-0">
          <EventList events={events} />
        </div>
      )}
    </div>
  );
}
