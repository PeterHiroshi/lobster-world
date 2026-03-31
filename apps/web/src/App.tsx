import { useCallback, useRef, useEffect } from 'react';
import { StatsPanel } from './panels/StatsPanel';
import { ChatPanel } from './panels/ChatPanel';
import { ConnectionStatus } from './panels/ConnectionStatus';
import { ActivityFeed } from './panels/ActivityFeed';
import { TaskPanel } from './panels/TaskPanel';
import { TeamPanel } from './panels/TeamPanel';
import { BudgetBar } from './panels/BudgetBar';
import { A2APanel } from './panels/A2APanel';
import { SoundToggle } from './components/SoundToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { MobileNav } from './components/MobileNav';
import { LobbyScreen } from './components/LobbyScreen';
import { LandingPage } from './components/LandingPage';
import { PermissionRequestOverlay } from './components/PermissionRequestOverlay';
import { DemoTour } from './components/DemoTour';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Scene } from './components/Scene';
import { useIsMobile } from './hooks/useMediaQuery';
import { useWebSocket } from './hooks/useWebSocket';
import { useWorldStore } from './store/useWorldStore';
import { DemoSocialProxy } from './lib/DemoSocialProxy';
import { startDemoScenario, stopDemoScenario } from './lib/DemoScenario';
import { WS_SOCIAL_URL } from './lib/constants';
import type { LobbyProfile } from '@lobster-world/protocol';

export function App() {
  const phase = useWorldStore((s) => s.lobbyState.phase);

  // Only connect viewer WebSocket after entering the world — avoids
  // "WebSocket connection error" on lobby/landing screens.
  useWebSocket(phase === 'joined');

  const isMobile = useIsMobile();

  const setLobbyPhase = useWorldStore((s) => s.setLobbyPhase);
  const setLobbyError = useWorldStore((s) => s.setLobbyError);
  const setSessionToken = useWorldStore((s) => s.setSessionToken);
  const setBudgetStatus = useWorldStore((s) => s.setBudgetStatus);
  const addPermissionRequest = useWorldStore((s) => s.addPermissionRequest);

  const proxyRef = useRef<DemoSocialProxy | null>(null);
  const demModeRef = useRef(false);

  useEffect(() => {
    return () => {
      stopDemoScenario();
      proxyRef.current?.disconnect();
    };
  }, []);

  const connectProxy = useCallback(
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
        onDialogueInvitation: () => {},
        onDialogueMessage: () => {},
        onDialogueEnded: () => {},
      });

      proxyRef.current = proxy;
      proxy.connect(WS_SOCIAL_URL, profile);
    },
    [setLobbyPhase, setLobbyError, setSessionToken, setBudgetStatus, addPermissionRequest],
  );

  const handleEnterWorld = useCallback(() => {
    demModeRef.current = false;
    setLobbyPhase('lobby');
  }, [setLobbyPhase]);

  const handleWatchDemo = useCallback(() => {
    demModeRef.current = true;
    setSessionToken('demo-visitor');
    startDemoScenario();
  }, [setSessionToken]);

  const handleJoin = useCallback(
    (profile: LobbyProfile) => connectProxy(profile),
    [connectProxy],
  );

  if (phase === 'landing') {
    return <LandingPage onEnter={handleEnterWorld} onDemo={handleWatchDemo} />;
  }

  if (phase !== 'joined') {
    return <LobbyScreen onJoin={handleJoin} />;
  }

  return (
    <div className="relative w-full h-full">
      <ErrorBoundary>
        <Scene />
      </ErrorBoundary>
      <StatsPanel />
      <ChatPanel />
      <ConnectionStatus />
      <ActivityFeed />
      <TaskPanel />
      <TeamPanel />
      <BudgetBar />
      <A2APanel />
      <SoundToggle />
      <ThemeToggle />
      <PermissionRequestOverlay />
      <DemoTour />
      {isMobile && <MobileNav />}
    </div>
  );
}
