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
      className="absolute bottom-3 right-3 z-10 panel-glass px-3 py-2 rounded-lg text-sm hover:opacity-90 transition-colors hidden md:block"
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? 'Sound Off' : 'Sound On'}
    </button>
  );
}
