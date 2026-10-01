import { FC, useState } from 'react';
import { X, Key, Volume2, Shield, Trash2, Check, ExternalLink } from 'lucide-react';
import { UserSettings, saveSettings, purgeAllData } from '../db/indexedDB';
import { sounds } from '../services/soundEffects';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdate: (updated: UserSettings) => void;
  onClose: () => void;
}

export const SettingsView: FC<SettingsViewProps> = ({ settings, onUpdate, onClose }) => {
  const [groqKey, setGroqKey] = useState(settings.groqKey || '');
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '');
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);
  const [blacklist, setBlacklist] = useState(settings.distractionBlacklist || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    const updated: UserSettings = {
      ...settings,
      groqKey: groqKey.trim(),
      geminiKey: geminiKey.trim(),
      soundEnabled,
      distractionBlacklist: blacklist,
    };
    sounds.setEnabled(soundEnabled);
    await saveSettings(updated);
    onUpdate(updated);
    if (soundEnabled) sounds.playChime();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !blacklist.includes(kw)) {
      setBlacklist([...blacklist, kw]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setBlacklist(blacklist.filter((k) => k !== kw));
  };

  const handlePurge = async () => {
    if (confirm('Are you sure you want to delete all saved chats, tasks, and settings?')) {
      await purgeAllData();
      window.location.reload();
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col p-4 text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-sm text-slate-100">FloatCompanion Settings</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
        {/* API Keys Section */}
        <div className="space-y-3 p-3 bg-slate-900/60 rounded-xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">AI Engine API Keys</span>
            <span className="text-[10px] text-slate-500 font-mono">Stored Locally in IndexedDB</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Groq API Key (Llama-3.3 ultra-fast)</label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Google Gemini API Key (Multimodal)</label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
              >
                <span>Get Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Audio Effects Section */}
        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-200 block font-medium">Procedural Acoustic Audio</span>
              <span className="text-[10px] text-slate-500">Chimes for focus sprints and alerts</span>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sounds.setEnabled(next);
              if (next) sounds.playChime();
            }}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
              soundEnabled ? 'bg-sky-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Focus Guardian Blacklist Section */}
        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-slate-200 font-medium">Distraction Watchlist</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Window titles containing these keywords trigger alert pulses during active focus sprints.
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. steam, discord..."
              className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
            />
            <button
              onClick={handleAddKeyword}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-[11px]"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {blacklist.map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-slate-300 text-[10px] flex items-center gap-1"
              >
                <span>{kw}</span>
                <button
                  onClick={() => handleRemoveKeyword(kw)}
                  className="hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-2 flex justify-between items-center text-[11px]">
          <button
            onClick={handlePurge}
            className="flex items-center gap-1 text-red-400 hover:text-red-300 hover:underline"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Local Data</span>
          </button>
        </div>
      </div>

      {/* Footer Save Button */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-md shadow-sky-950 transition-colors"
        >
          {savedSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : null}
          <span>{savedSuccess ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
};
