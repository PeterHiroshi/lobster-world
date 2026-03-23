import { memo, useState, useCallback } from 'react';
import { LobsterPartType } from '@lobster-world/protocol';
import { CUSTOMIZATION_HEX_COLOR_REGEX } from '@lobster-world/protocol';
import { useWorldStore, AVAILABLE_OPTIONS } from '../store/useWorldStore';
import { LobsterPreview3D } from './LobsterPreview3D';
import { API_BASE_URL } from '../lib/constants';

const PART_TABS: { key: LobsterPartType; label: string }[] = [
  { key: LobsterPartType.BODY, label: 'Body' },
  { key: LobsterPartType.CLAWS, label: 'Claws' },
  { key: LobsterPartType.EYES, label: 'Eyes' },
  { key: LobsterPartType.TAIL, label: 'Tail' },
  { key: LobsterPartType.ACCESSORIES, label: 'Accessories' },
];

const PRESET_COLORS = [
  '#FF6B35', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
  '#06B6D4', '#10B981', '#6366F1', '#F43F5E',
];

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${
              value === c ? 'border-white scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
            onClick={() => onChange(c)}
            aria-label={`Select color ${c}`}
          />
        ))}
      </div>
      <input
        type="color"
        value={CUSTOMIZATION_HEX_COLOR_REGEX.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-full h-8 cursor-pointer rounded border border-gray-600"
      />
    </div>
  );
}

export const LobsterCustomizer = memo(function LobsterCustomizer() {
  const customizerOpen = useWorldStore((s) => s.customizerOpen);
  const customizerLobsterId = useWorldStore((s) => s.customizerLobsterId);
  const editingSkin = useWorldStore((s) => s.editingSkin);
  const updateEditingSkin = useWorldStore((s) => s.updateEditingSkin);
  const resetEditingSkin = useWorldStore((s) => s.resetEditingSkin);
  const closeCustomizer = useWorldStore((s) => s.closeCustomizer);
  const lobsters = useWorldStore((s) => s.lobsters);

  const [activeTab, setActiveTab] = useState<LobsterPartType>(LobsterPartType.BODY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!customizerLobsterId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/lobsters/${customizerLobsterId}/customize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skin: editingSkin }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        setError(body.error ?? 'Failed to save skin');
        return;
      }
      closeCustomizer();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }, [customizerLobsterId, editingSkin, closeCustomizer]);

  if (!customizerOpen || !customizerLobsterId) return null;

  const lobster = lobsters[customizerLobsterId];
  const lobsterName = lobster?.profile.name ?? 'Lobster';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel-glass w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Customize {lobsterName}
          </h2>
          <button
            onClick={closeCustomizer}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Close customizer"
          >
            &times;
          </button>
        </div>

        {/* 3D Preview */}
        <LobsterPreview3D skin={editingSkin} />

        {/* Part Tabs */}
        <div className="flex gap-1 mt-4 mb-3 overflow-x-auto">
          {PART_TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[120px]">
          {activeTab === LobsterPartType.BODY && (
            <ColorPicker
              label="Body Color"
              value={editingSkin.bodyColor}
              onChange={(c) => updateEditingSkin({ bodyColor: c })}
            />
          )}
          {activeTab === LobsterPartType.CLAWS && (
            <>
              <ColorPicker
                label="Left Claw Color"
                value={editingSkin.claw1Color ?? editingSkin.bodyColor}
                onChange={(c) => updateEditingSkin({ claw1Color: c })}
              />
              <ColorPicker
                label="Right Claw Color"
                value={editingSkin.claw2Color ?? editingSkin.bodyColor}
                onChange={(c) => updateEditingSkin({ claw2Color: c })}
              />
            </>
          )}
          {activeTab === LobsterPartType.EYES && (
            <>
              <ColorPicker
                label="Eye Color"
                value={editingSkin.eyeColor ?? '#000000'}
                onChange={(c) => updateEditingSkin({ eyeColor: c })}
              />
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Eye Style
                </label>
                <div className="flex gap-2">
                  {AVAILABLE_OPTIONS.eyes.map((opt) => (
                    <button
                      key={opt.id}
                      className={`px-3 py-1.5 rounded text-sm ${
                        editingSkin.eyeStyle === opt.id
                          ? 'bg-white/20 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                      onClick={() => updateEditingSkin({ eyeStyle: opt.id })}
                    >
                      {opt.displayName}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {activeTab === LobsterPartType.TAIL && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tail Style
              </label>
              <div className="flex gap-2">
                {AVAILABLE_OPTIONS.tail.map((opt) => (
                  <button
                    key={opt.id}
                    className={`px-3 py-1.5 rounded text-sm ${
                      editingSkin.tailStyle === opt.id
                        ? 'bg-white/20 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => updateEditingSkin({ tailStyle: opt.id })}
                  >
                    {opt.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeTab === LobsterPartType.ACCESSORIES && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Accessory
              </label>
              <div className="flex gap-2 flex-wrap">
                {AVAILABLE_OPTIONS.accessories.map((opt) => (
                  <button
                    key={opt.id}
                    className={`px-3 py-1.5 rounded text-sm ${
                      editingSkin.accessoryType === opt.id
                        ? 'bg-white/20 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => updateEditingSkin({ accessoryType: opt.id })}
                  >
                    {opt.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={resetEditingSkin}
            className="px-4 py-2 rounded text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Reset
          </button>
          <div className="flex-1" />
          <button
            onClick={closeCustomizer}
            className="px-4 py-2 rounded text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
});
