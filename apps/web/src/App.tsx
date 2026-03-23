import { useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { StatsPanel } from './panels/StatsPanel';
import { ChatPanel } from './panels/ChatPanel';
import { ConnectionStatus } from './panels/ConnectionStatus';
import { ActivityFeed } from './panels/ActivityFeed';
import { TaskPanel } from './panels/TaskPanel';
import { TeamPanel } from './panels/TeamPanel';
import { BudgetBar } from './panels/BudgetBar';
import { SoundToggle } from './components/SoundToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { MobileNav } from './components/MobileNav';
import { LobbyScreen } from './components/LobbyScreen';
import { LandingPage } from './components/LandingPage';
import { PermissionRequestOverlay } from './components/PermissionRequestOverlay';
import { DemoTour } from './components/DemoTour';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useIsMobile } from './hooks/useMediaQuery';

const Scene = lazy(() => import('./components/Scene').then((m) => ({ default: m.Scene })));
import { useWebSocket } from './hooks/useWebSocket';
import { useWorldStore } from './store/useWorldStore';
import { DemoSocialProxy } from './lib/DemoSocialProxy';
import { startDemoScenario, stopDemoScenario } from './lib/DemoScenario';
import { WS_SOCIAL_URL } from './lib/constants';
import type { LobbyProfile } from '@lobster-world/protocol';

export function App() {
  useWebSocket();
  const isMobile = useIsMobile();

  const phase = useWorldStore((s) => s.lobbyState.phase);
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
    const demoProfile: LobbyProfile = {
      displayName: 'Demo Visitor',
      color: '#6366f1',
      bio: 'Watching the demo',
      skills: ['coding'],
      dailyTokenLimit: 50000,
      sessionTokenLimit: 5000,
      permissionPreset: 'open',
    };
    connectProxy(demoProfile);
  }, [connectProxy]);

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
      <ThemeToggle />
      <PermissionRequestOverlay />
      <DemoTour />
      {isMobile && <MobileNav />}
    </div>
  );
}
