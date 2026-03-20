import { useState } from 'react';
import { useWorldStore } from '../store/useWorldStore';

export function ChatPanel() {
  const lobsters = useWorldStore((s) => s.lobsters);
  const stats = useWorldStore((s) => s.stats);
  const [isOpen, setIsOpen] = useState(true);

  // Collect lobsters that have active bubbles (recent chat activity)
  const chattingLobsters = Object.values(lobsters).filter((l) => l.bubbleText);

  return (
    <div className="absolute top-14 right-3 z-10 w-72">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-900/80 backdrop-blur text-white px-3 py-2 rounded-t-lg text-sm font-medium flex justify-between items-center hover:bg-gray-800/80 transition-colors"
      >
        <span>Chat Activity</span>
        <span className="text-gray-400 text-xs">
          {stats.activeDialogues} active {isOpen ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {isOpen && (
        <div className="bg-gray-900/80 backdrop-blur rounded-b-lg max-h-80 overflow-y-auto">
          {chattingLobsters.length === 0 && Object.keys(lobsters).length === 0 ? (
            <div className="text-gray-500 text-sm p-3 text-center">
              No lobsters connected
            </div>
          ) : chattingLobsters.length === 0 ? (
            <div className="text-gray-500 text-sm p-3 text-center">
              No active conversations
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {chattingLobsters.map((lobster) => (
                <div key={lobster.id} className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: lobster.profile.color }}
                    />
                    <span className="text-white text-sm font-medium">
                      {lobster.profile.name}
                    </span>
                  </div>
                  {lobster.bubbleText && (
                    <div className="text-gray-300 text-xs bg-gray-800/50 rounded px-2 py-1">
                      {lobster.bubbleText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Lobster list */}
          <div className="border-t border-gray-700/50 p-2">
            <div className="text-gray-500 text-xs mb-1">Connected ({Object.keys(lobsters).length})</div>
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
