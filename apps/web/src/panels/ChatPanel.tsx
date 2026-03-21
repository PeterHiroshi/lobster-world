import { useState, useRef, useEffect, memo } from 'react';
import { useWorldStore } from '../store/useWorldStore';
import type { ActiveDialogue, DialogueMessageEntry } from '../store/useWorldStore';

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <span className="inline-flex gap-0.5 items-center">
      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
});

const MessageBubble = memo(function MessageBubble({ msg }: { msg: DialogueMessageEntry }) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex gap-2 items-start">
      <span
        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
        style={{ backgroundColor: msg.fromColor }}
      />
      <div className="min-w-0">
        <span className="text-xs font-medium" style={{ color: msg.fromColor }}>
          {msg.fromName}
        </span>
        <div className="text-gray-300 text-xs mt-0.5">
          {showContent ? msg.content : <TypingIndicator />}
        </div>
      </div>
    </div>
  );
});

const DialogueCard = memo(function DialogueCard({ dialogue }: { dialogue: ActiveDialogue }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dialogue.messages.length, isExpanded]);

  return (
    <div className={`border-b border-gray-700/50 ${dialogue.ended ? 'opacity-60' : ''}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {dialogue.participantColors.map((color, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-gray-300 text-xs truncate">
            {dialogue.participantNames.join(' & ')}
          </span>
          {dialogue.ended && (
            <span className="text-gray-500 text-xs ml-1">
              ({dialogue.endReason === 'circuit_breaker' ? 'killed' : 'ended'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-gray-500 text-xs">{dialogue.messages.length} msgs</span>
          <span className="text-gray-500 text-xs">{isExpanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </button>

      {/* Messages */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="px-3 pb-2 space-y-2 max-h-48 overflow-y-auto"
        >
          {/* Intent */}
          <div className="text-gray-500 text-xs italic">
            {dialogue.intent}
          </div>

          {dialogue.messages.map((msg, i) => (
            <MessageBubble key={`${msg.fromId}-${i}`} msg={msg} />
          ))}

          {!dialogue.ended && dialogue.messages.length > 0 && (
            <div className="text-gray-500 text-xs flex items-center gap-1">
              <TypingIndicator />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export function ChatPanel() {
  const activeDialogues = useWorldStore((s) => s.activeDialogues);
  const lobsters = useWorldStore((s) => s.lobsters);
  const stats = useWorldStore((s) => s.stats);
  const [isOpen, setIsOpen] = useState(true);

  const dialogueList = Object.values(activeDialogues).sort(
    (a, b) => (a.ended ? 1 : 0) - (b.ended ? 1 : 0),
  );

  return (
    <div className="absolute top-14 right-3 z-10 w-80">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-900/80 backdrop-blur text-white px-3 py-2 rounded-t-lg text-sm font-medium flex justify-between items-center hover:bg-gray-800/80 transition-colors"
      >
        <span>Dialogues</span>
        <span className="text-gray-400 text-xs">
          {stats.activeDialogues} active {isOpen ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {isOpen && (
        <div className="bg-gray-900/80 backdrop-blur rounded-b-lg max-h-96 overflow-y-auto">
          {dialogueList.length === 0 ? (
            <div className="text-gray-500 text-sm p-3 text-center">
              {Object.keys(lobsters).length === 0
                ? 'No lobsters connected'
                : 'No active conversations'}
            </div>
          ) : (
            dialogueList.map((d) => (
              <DialogueCard key={d.sessionId} dialogue={d} />
            ))
          )}

          {/* Connected lobsters */}
          <div className="border-t border-gray-700/50 p-2">
            <div className="text-gray-500 text-xs mb-1">
              Connected ({Object.keys(lobsters).length})
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.values(lobsters).map((l) => (
                <span
                  key={l.id}
                  className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded"
                >
                  {l.profile.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
