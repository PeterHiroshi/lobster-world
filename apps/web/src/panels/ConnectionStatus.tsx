import { useWorldStore } from '../store/useWorldStore';
import { WS_VIEWER_URL } from '../lib/constants';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  connected: { color: '#22c55e', label: 'Connected' },
  connecting: { color: '#eab308', label: 'Connecting...' },
  disconnected: { color: '#ef4444', label: 'Disconnected' },
  error: { color: '#ef4444', label: 'Error' },
};

export function ConnectionStatus() {
  const connectionStatus = useWorldStore((s) => s.connectionStatus);
  const config = STATUS_CONFIG[connectionStatus] ?? STATUS_CONFIG.disconnected;

  return (
    <div className="absolute top-3 right-3 z-10 bg-gray-900/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full inline-block"
        style={{ backgroundColor: config.color }}
      />
      <span>{config.label}</span>
      <span className="text-gray-500 text-xs ml-1">{WS_VIEWER_URL}</span>
    </div>
  );
}
