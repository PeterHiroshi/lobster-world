import { memo, useState, useCallback } from 'react';
import { BottomSheet } from './BottomSheet';
import { ChatPanel } from '../panels/ChatPanel';
import { ActivityFeed } from '../panels/ActivityFeed';
import { TeamPanel } from '../panels/TeamPanel';
import { useWorldStore } from '../store/useWorldStore';

type MobileTab = 'chat' | 'team' | 'activity' | 'stats' | null;

const TAB_CONFIG: { id: MobileTab; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '\uD83D\uDCAC' },
  { id: 'team', label: 'Team', icon: '\uD83D\uDC65' },
  { id: 'activity', label: 'Activity', icon: '\u26A1' },
  { id: 'stats', label: 'Stats', icon: '\uD83D\uDCCA' },
];

function MobileNavInner() {
  const [activeTab, setActiveTab] = useState<MobileTab>(null);
  const stats = useWorldStore((s) => s.stats);

  const handleTabClick = useCallback((tab: MobileTab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  }, []);

  const handleClose = useCallback(() => setActiveTab(null), []);

  return (
    <>
      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 panel-glass border-t border-slate-300/20 dark:border-slate-700/50 flex items-center justify-around py-2 px-1 safe-area-bottom">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-indigo-600/20' : ''
            }`}
            data-testid={`mobile-nav-${tab.id}`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom sheets */}
      <BottomSheet isOpen={activeTab === 'chat'} onClose={handleClose} title="Dialogues">
        <ChatPanel embedded />
      </BottomSheet>

      <BottomSheet isOpen={activeTab === 'team'} onClose={handleClose} title="Team">
        <TeamPanel embedded />
      </BottomSheet>

      <BottomSheet isOpen={activeTab === 'activity'} onClose={handleClose} title="Activity Feed">
        <ActivityFeed embedded />
      </BottomSheet>

      <BottomSheet isOpen={activeTab === 'stats'} onClose={handleClose} title="Stats">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="opacity-60">Lobsters</span>
            <span className="font-semibold">{stats.lobsterCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-60">Active Dialogues</span>
            <span className="font-semibold">{stats.activeDialogues}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-60">Total Messages</span>
            <span className="font-semibold">{stats.totalMessages}</span>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

export const MobileNav = memo(MobileNavInner);
