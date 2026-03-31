import { useState, useCallback, memo } from 'react';
import { useWorldStore } from '../store/useWorldStore';
import { ThemeToggle } from './ThemeToggle';
import type { LobbyProfile, SkillTag, PermissionPreset } from '@lobster-world/protocol';
import {
  LOBBY_PRESET_COLORS,
  LOBBY_SKILL_TAGS,
  BIO_MAX_LENGTH,
  BUDGET_DAILY_MIN,
  BUDGET_DAILY_MAX,
  BUDGET_SESSION_MIN,
  BUDGET_SESSION_MAX,
  DEFAULT_BUDGET_CONFIG,
} from '@lobster-world/protocol';

interface LobbyScreenProps {
  onJoin: (profile: LobbyProfile) => void;
}

function LobbyScreenInner({ onJoin }: LobbyScreenProps) {
  const lobbyState = useWorldStore((s) => s.lobbyState);
  const connectionStatus = useWorldStore((s) => s.connectionStatus);

  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState(LOBBY_PRESET_COLORS[0]);
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<SkillTag[]>([]);
  const [dailyTokenLimit, setDailyTokenLimit] = useState(DEFAULT_BUDGET_CONFIG.daily.maxTokens);
  const [sessionTokenLimit, setSessionTokenLimit] = useState(DEFAULT_BUDGET_CONFIG.perSession.maxTokens);
  const [permissionPreset, setPermissionPreset] = useState<PermissionPreset>('selective');

  const toggleSkill = useCallback((skill: SkillTag) => {
    setSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!displayName.trim()) return;
    const profile: LobbyProfile = {
      displayName: displayName.trim(),
      color,
      bio: bio.trim(),
      skills,
      dailyTokenLimit,
      sessionTokenLimit,
      permissionPreset,
    };
    onJoin(profile);
  }, [displayName, color, bio, skills, dailyTokenLimit, sessionTokenLimit, permissionPreset, onJoin]);

  const isJoining = lobbyState.phase === 'joining';
  const canSubmit = displayName.trim().length > 0 && !isJoining;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-100 via-indigo-100 to-slate-100 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900">
      <ThemeToggle />
      <div className="w-full max-w-lg mx-4 my-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1 text-center">Lobster World</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">Configure your lobster and enter the virtual office</p>

        {/* Display Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Display Name *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your lobster name..."
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={30}
            data-testid="display-name-input"
          />
        </div>

        {/* Color Picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Color</label>
          <div className="flex gap-2 flex-wrap" data-testid="color-picker">
            {LOBBY_PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
                data-testid={`color-${c}`}
              />
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            Bio <span className="text-slate-500">({bio.length}/{BIO_MAX_LENGTH})</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-16"
            data-testid="bio-input"
          />
        </div>

        {/* Skills */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Skills</label>
          <div className="flex gap-2 flex-wrap" data-testid="skill-tags">
            {LOBBY_SKILL_TAGS.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  skills.includes(skill)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
                data-testid={`skill-${skill}`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Sliders */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Daily Token Limit: {dailyTokenLimit.toLocaleString()}
            </label>
            <input
              type="range"
              min={BUDGET_DAILY_MIN}
              max={BUDGET_DAILY_MAX}
              step={1000}
              value={dailyTokenLimit}
              onChange={(e) => setDailyTokenLimit(Number(e.target.value))}
              className="w-full accent-indigo-500"
              data-testid="daily-token-slider"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Session Token Limit: {sessionTokenLimit.toLocaleString()}
            </label>
            <input
              type="range"
              min={BUDGET_SESSION_MIN}
              max={BUDGET_SESSION_MAX}
              step={100}
              value={sessionTokenLimit}
              onChange={(e) => setSessionTokenLimit(Number(e.target.value))}
              className="w-full accent-indigo-500"
              data-testid="session-token-slider"
            />
          </div>
        </div>

        {/* Permission Preset */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Permission Mode</label>
          <select
            value={permissionPreset}
            onChange={(e) => setPermissionPreset(e.target.value as PermissionPreset)}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="permission-select"
          >
            <option value="open">Open — Accept all dialogue requests</option>
            <option value="selective">Selective — Ask before each dialogue</option>
            <option value="private">Private — Reject all by default</option>
          </select>
        </div>

        {/* Lobster Preview */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-12 rounded-full"
            style={{ backgroundColor: color, opacity: 0.9 }}
            data-testid="lobster-preview"
          />
        </div>

        {/* Error */}
        {lobbyState.error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm" data-testid="lobby-error">
            <p>{lobbyState.error}</p>
            <button
              onClick={handleSubmit}
              className="mt-2 px-4 py-1.5 border border-indigo-500 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-sm font-medium transition-colors"
              data-testid="retry-button"
            >
              Retry
            </button>
          </div>
        )}

        {/* Connection Status */}
        {connectionStatus === 'error' && (
          <div className="mb-4 p-2 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-xs text-center">
            Connection error — retrying...
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
            canSubmit
              ? 'bg-indigo-600 hover:bg-indigo-500'
              : 'bg-slate-600 cursor-not-allowed'
          }`}
          data-testid="enter-world-button"
        >
          {isJoining ? 'Joining...' : 'Enter World'}
        </button>
      </div>
    </div>
  );
}

export const LobbyScreen = memo(LobbyScreenInner);
