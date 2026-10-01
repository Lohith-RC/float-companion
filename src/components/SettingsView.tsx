import { FC, useState, useEffect } from 'react';
import { X, Key, Volume2, Shield, Trash2, Check, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { UserSettings, saveSettings, purgeAllData } from '../db/indexedDB';
import { sounds } from '../services/soundEffects';
import { useToastStore } from '../store/useToastStore';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdate: (updated: UserSettings) => void;
  onClose: () => void;
}

export const SettingsView: FC<SettingsViewProps> = ({ settings, onUpdate, onClose }) => {
  const [groqKey, setGroqKey] = useState(settings.groqKey || '');
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '');
  const [showGroq, setShowGroq] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);
  const [blacklist, setBlacklist] = useState(settings.distractionBlacklist || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  // Hydrate credentials from Windows DPAPI hardware vault if available
  useEffect(() => {
    if (window.electronAPI?.store?.getSecureKey) {
      window.electronAPI.store.getSecureKey('groq').then((res) => {
        if (res.key) setGroqKey(res.key);
      }).catch(() => {});
      window.electronAPI.store.getSecureKey('gemini').then((res) => {
        if (res.key) setGeminiKey(res.key);
      }).catch(() => {});
    }
  }, []);

  const handleSave = async () => {
    const cleanGroq = groqKey.trim();
    const cleanGemini = geminiKey.trim();
    const updated: UserSettings = {
      ...settings,
      groqKey: cleanGroq,
      geminiKey: cleanGemini,
      soundEnabled,
      distractionBlacklist: blacklist,
    };
    sounds.setEnabled(soundEnabled);
    await saveSettings(updated);

    onUpdate(updated);
    if (soundEnabled) sounds.playChime();
    setSavedSuccess(true);
    useToastStore.getState().showToast('Settings & DPAPI keys saved securely', 'success');
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !blacklist.includes(kw)) {
      setBlacklist([...blacklist, kw]);
      setNewKeyword('');
      sounds.playClick();
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setBlacklist(blacklist.filter((k) => k !== kw));
    sounds.playClick();
  };

  const handlePurge = async () => {
    if (!confirmPurge) {
      setConfirmPurge(true);
      setTimeout(() => setConfirmPurge(false), 4000);
      return;
    }
    await purgeAllData();
    if (window.electronAPI?.store?.setSecureKey) {
      await window.electronAPI.store.setSecureKey('groq', '');
      await window.electronAPI.store.setSecureKey('gemini', '');
    }
    sounds.playAlert();
    useToastStore.getState().showToast('All local and vault data wiped cleanly.', 'info');
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col p-4 text-xs select-none">
      {/* Header Island */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
            <Key className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div>
            <span className="font-bold text-xs text-white block">FloatCompanion Key Vault</span>
            <span className="text-[10px] text-slate-400 font-tabular">Local Hardware Storage</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
        {/* API Keys Section */}
        <div className="space-y-3 p-3 bg-slate-900/60 rounded-xl border border-white/10 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Neural Engine Credentials</span>
            <span className="text-[9px] text-slate-400 font-tabular px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
              DPAPI / IndexedDB
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-300 font-medium">Groq API Key (Llama-3.3 70B)</label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5 font-medium"
              >
                <span>Free Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="relative flex items-center">
              <input
                type={showGroq ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-slate-950/90 border border-white/10 rounded-lg px-2.5 py-1.5 pr-8 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowGroq(!showGroq)}
                className="absolute right-2 text-slate-500 hover:text-slate-300"
              >
                {showGroq ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-300 font-medium">Google Gemini Key (Gemini 2.5)</label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5 font-medium"
              >
                <span>Free Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="relative flex items-center">
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950/90 border border-white/10 rounded-lg px-2.5 py-1.5 pr-8 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-2 text-slate-500 hover:text-slate-300"
              >
                {showGemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Audio Effects Section */}
        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div>
              <span className="text-slate-200 block font-semibold text-xs">Procedural Synthesizer</span>
              <span className="text-[10px] text-slate-400">Web Audio API acoustic feedback</span>
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
        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-2 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-slate-200 font-semibold text-xs">Distraction Watchlist</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Window titles containing these keywords trigger alert pulses during active focus sprints.
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. steam, discord, netflix..."
              className="flex-1 bg-slate-950/90 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 shadow-inner"
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
            />
            <button
              onClick={handleAddKeyword}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-[11px] active:scale-95 transition-all shadow-sm"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {blacklist.map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/10 text-slate-300 text-[10px] flex items-center gap-1 font-tabular"
              >
                <span>{kw}</span>
                <button
                  onClick={() => handleRemoveKeyword(kw)}
                  className="hover:text-red-400 transition-colors ml-0.5 text-slate-400"
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
            className={`flex items-center gap-1.5 transition-all px-2.5 py-1 rounded-lg ${
              confirmPurge
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-semibold animate-pulse shadow-sm'
                : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmPurge ? '⚠️ Click Again to Confirm Wipe' : 'Purge Local Data'}</span>
          </button>
        </div>
      </div>

      {/* Footer Save Button */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors active:scale-95"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-md shadow-sky-950 transition-all active:scale-95"
        >
          {savedSuccess ? <Check className="w-3.5 h-3.5 text-white stroke-[3]" /> : null}
          <span>{savedSuccess ? 'Saved' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
};
