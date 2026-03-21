import { Scene } from './components/Scene';
import { StatsPanel } from './panels/StatsPanel';
import { ChatPanel } from './panels/ChatPanel';
import { ConnectionStatus } from './panels/ConnectionStatus';
import { ActivityFeed } from './panels/ActivityFeed';
import { TaskPanel } from './panels/TaskPanel';
import { TeamPanel } from './panels/TeamPanel';
import { SoundToggle } from './components/SoundToggle';
import { useWebSocket } from './hooks/useWebSocket';

export function App() {
  useWebSocket();

  return (
    <div className="relative w-full h-full">
      <Scene />
      <StatsPanel />
      <ChatPanel />
      <ConnectionStatus />
      <ActivityFeed />
      <TaskPanel />
      <TeamPanel />
      <SoundToggle />
    </div>
  );
}
