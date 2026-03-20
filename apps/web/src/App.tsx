import { Scene } from './components/Scene';
import { StatsPanel } from './panels/StatsPanel';
import { ChatPanel } from './panels/ChatPanel';
import { ConnectionStatus } from './panels/ConnectionStatus';
import { useWebSocket } from './hooks/useWebSocket';

export function App() {
  useWebSocket();

  return (
    <div className="relative w-full h-full">
      <Scene />
      <StatsPanel />
      <ChatPanel />
      <ConnectionStatus />
    </div>
  );
}
