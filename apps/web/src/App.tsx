import { useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { StatsPanel } from './panels/StatsPanel';
import { ChatPanel } from './panels/ChatPanel';
import { ConnectionStatus } from './panels/ConnectionStatus';
import { ActivityFeed } from './panels/ActivityFeed';
import { TaskPanel } from './panels/TaskPanel';
import { TeamPanel } from './panels/TeamPanel';
import { BudgetBar } from './panels/BudgetBar';
import { SoundToggle } from './components/SoundToggle';
import { LobbyScreen } from './components/LobbyScreen';
import { PermissionRequestOverlay } from './components/PermissionRequestOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';

const Scene = lazy(() => import('./components/Scene').then((m) => ({ default: m.Scene })));
import { useWebSocket } from './hooks/useWebSocket';
import { useWorldStore } from './store/useWorldStore';
import { DemoSocialProxy } from './lib/DemoSocialProxy';
import { startDemoScenario, stopDemoScenario } from './lib/DemoScenario';
import { WS_SOCIAL_URL } from './lib/constants';
import type { LobbyProfile } from '@lobster-world/protocol';

export function App() {
  useWebSocket();

  const phase = useWorldStore((s) => s.lobbyState.phase);
  const setLobbyPhase = useWorldStore((s) => s.setLobbyPhase);
  const setLobbyError = useWorldStore((s) => s.setLobbyError);
  const setSessionToken = useWorldStore((s) => s.setSessionToken);
  const setBudgetStatus = useWorldStore((s) => s.setBudgetStatus);
  const addPermissionRequest = useWorldStore((s) => s.addPermissionRequest);

  const proxyRef = useRef<DemoSocialProxy | null>(null);

  useEffect(() => {
    return () => {
      stopDemoScenario();
      proxyRef.current?.disconnect();
    };
  }, []);

  const handleJoin = useCallback(
    (profile: LobbyProfile) => {
      setLobbyPhase('joining');

      const proxy = new DemoSocialProxy({
        onJoined: (token) => {
          setSessionToken(token);
          startDemoScenario();
        },
        onError: (error) => {
          setLobbyError(error);
        },
        onBudgetStatus: (status) => {
          setBudgetStatus(status);
        },
        onPermissionRequest: (request) => {
          addPermissionRequest(request);
        },
        onDialogueInvitation: () => {
          // Handled via viewer WS for now
        },
        onDialogueMessage: () => {
          // Handled via viewer WS for now
        },
        onDialogueEnded: () => {
          // Handled via viewer WS for now
        },
      });

      proxyRef.current = proxy;
      proxy.connect(WS_SOCIAL_URL, profile);
    },
    [setLobbyPhase, setLobbyError, setSessionToken, setBudgetStatus, addPermissionRequest],
  );

  if (phase !== 'joined') {
    return <LobbyScreen onJoin={handleJoin} />;
  }

  return (
    <div className="relative w-full h-full">
      <ErrorBoundary>
        <Suspense fallback={<div className="flex items-center justify-center w-full h-full text-gray-400">Loading 3D scene...</div>}>
          <Scene />
        </Suspense>
      </ErrorBoundary>
      <StatsPanel />
      <ChatPanel />
      <ConnectionStatus />
      <ActivityFeed />
      <TaskPanel />
      <TeamPanel />
      <BudgetBar />
      <SoundToggle />
      <PermissionRequestOverlay />
    </div>
  );
}
