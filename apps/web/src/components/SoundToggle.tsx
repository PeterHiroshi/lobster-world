import { useState, useCallback } from 'react';
import { setMuted, getMuted } from '../lib/audio';

export function SoundToggle() {
  const [muted, setMutedState] = useState(getMuted());

  const toggle = useCallback(() => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  }, [muted]);

  return (
    <button
      onClick={toggle}
      className="absolute bottom-3 right-3 z-10 bg-gray-900/80 backdrop-blur text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-800/80 transition-colors"
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? 'Sound Off' : 'Sound On'}
    </button>
  );
}
