import { memo, useEffect, useCallback } from 'react';
import { Html } from '@react-three/drei';
import { useWorldStore } from '../store/useWorldStore';

export const LobsterDetailCard = memo(function LobsterDetailCard() {
  const selectedLobsterId = useWorldStore((s) => s.selectedLobsterId);
  const lobsters = useWorldStore((s) => s.lobsters);
  const lobsterStats = useWorldStore((s) => s.lobsterStats);
  const setSelectedLobster = useWorldStore((s) => s.setSelectedLobster);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-lobster-card]')) {
        setSelectedLobster(null);
      }
    },
    [setSelectedLobster],
  );

  useEffect(() => {
    if (selectedLobsterId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [selectedLobsterId, handleClickOutside]);

  if (!selectedLobsterId) return null;

  const lobster = lobsters[selectedLobsterId];
  if (!lobster) return null;

  const stats = lobsterStats[selectedLobsterId] ?? { messagesSent: 0, dialoguesParticipated: 0 };

  const moodEmoji: Record<string, string> = {
    happy: '😊',
    focused: '🎯',
    tired: '😴',
    excited: '🎉',
    neutral: '😐',
  };

  return (
    <group position={[lobster.position.x, 0, lobster.position.z]}>
      <Html
        position={[0.5, 1.2, 0]}
        distanceFactor={8}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          data-lobster-card
          className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 text-white shadow-lg border border-gray-700/50 w-56"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: lobster.profile.color }}
              />
              <span className="font-bold text-sm">{lobster.profile.name}</span>
            </div>
            <button
              onClick={() => setSelectedLobster(null)}
              className="text-gray-400 hover:text-white text-xs px-1"
            >
              x
            </button>
          </div>

          {/* Bio */}
          {lobster.profile.bio && (
            <div className="text-gray-400 text-xs mb-2 italic">
              {lobster.profile.bio}
            </div>
          )}

          {/* Skills */}
          <div className="flex flex-wrap gap-1 mb-2">
            {lobster.profile.skills.map((skill) => (
              <span
                key={skill}
                className="text-xs bg-gray-700/60 text-gray-300 px-1.5 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Status row */}
          <div className="grid grid-cols-2 gap-1 text-xs mb-2">
            <div className="text-gray-400">
              Activity: <span className="text-gray-200">{lobster.activity ?? 'Idle'}</span>
            </div>
            <div className="text-gray-400">
              Mood: <span className="text-gray-200">{moodEmoji[lobster.mood] ?? ''} {lobster.mood}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="border-t border-gray-700/50 pt-2 grid grid-cols-2 gap-1 text-xs">
            <div className="text-gray-400">
              Messages: <span className="text-gray-200 font-medium">{stats.messagesSent}</span>
            </div>
            <div className="text-gray-400">
              Dialogues: <span className="text-gray-200 font-medium">{stats.dialoguesParticipated}</span>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
});
