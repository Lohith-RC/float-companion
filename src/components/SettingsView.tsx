import { FC, useState, useEffect } from 'react';
import { X, Key, Volume2, Shield, Trash2, Check, ExternalLink, Eye, EyeOff, LogOut } from 'lucide-react';
import { UserSettings, saveSettings, purgeAllData } from '../db/indexedDB';
import { sounds } from '../services/soundEffects';
import { useToastStore } from '../store/useToastStore';
import { useAuthStore } from '../store/useAuthStore';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdate: (updated: UserSettings) => void;
  onClose: () => void;
}

export const SettingsView: FC<SettingsViewProps> = ({ settings, onUpdate, onClose }) => {
  const [groqKey, setGroqKey] = useState(settings.groqKey || '');
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '');
  const [defaultModel, setDefaultModel] = useState<'groq' | 'gemini' | 'ollama'>(
    settings.defaultModel === 'openai' ? 'groq' : settings.defaultModel || 'groq'
  );
  const [showGroq, setShowGroq] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);
  const [blacklist, setBlacklist] = useState(settings.distractionBlacklist || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const {
    user,
    openModal,
    logout,
    customClientId,
    setCustomClientId,
    customGoogleClientId,
    setCustomGoogleClientId,
  } = useAuthStore();
  const [clientIdDraft, setClientIdDraft] = useState(customClientId);
  const [googleClientIdDraft, setGoogleClientIdDraft] = useState(customGoogleClientId);
  const [showAdvancedAuth, setShowAdvancedAuth] = useState(false);

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
      defaultModel,
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

          {/* Active Model Engine Priority */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <label className="text-[11px] text-slate-300 font-medium block">Default Engine Priority</label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-white/10" role="radiogroup" aria-label="Default AI Engine Priority">
              {[
                { id: 'groq', label: '⚡ Groq (Fast)' },
                { id: 'gemini', label: '✨ Gemini 2.5' },
                { id: 'ollama', label: '🦙 Ollama (Local)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={defaultModel === m.id}
                  onClick={() => {
                    setDefaultModel(m.id as 'groq' | 'gemini' | 'ollama');
                    sounds.playClick();
                  }}
                  className={`py-1 px-1 text-[10px] rounded-md font-medium transition-all text-center ${
                    defaultModel === m.id
                      ? 'bg-sky-500/25 text-sky-300 border border-sky-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Multi-Provider OAuth Identity Section */}
        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔑</span>
              <span className="text-slate-200 font-semibold text-xs">Connected Accounts & OAuth</span>
            </div>
            <span className="text-[9px] text-emerald-400 font-tabular px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              100% Free OAuth
            </span>
          </div>

          {user ? (
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img
                      src={user.avatarUrl}
                      alt={user.name || user.login || 'User'}
                      className="w-9 h-9 rounded-full border border-sky-400/50 object-cover"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
                        user.provider === 'google' ? 'bg-sky-400' : 'bg-emerald-400'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      {user.name || user.login}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {user.provider === 'google' ? user.email : `@${user.login}`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-2 py-1 text-[10px] rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 flex items-center gap-1 transition-colors"
                  title="Disconnect account"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>

              {user.bio && (
                <p className="text-[10px] text-slate-300 italic line-clamp-2">
                  "{user.bio}"
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  {user.provider === 'google' ? (
                    <>
                      <span className="text-sky-400">✓</span>
                      <span>Google Identity Verified</span>
                    </>
                  ) : (
                    <>
                      <span>📦 {user.publicRepos || 0} Public Repos</span>
                    </>
                  )}
                </span>
                {user.htmlUrl && (
                  <a
                    href={user.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Connect your account for free to personalize your assistant avatar, name, and badge.
              </p>

              {/* Login Buttons Grid */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openModal('google')}
                  className="py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Google Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => openModal('github')}
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub Sign In</span>
                </button>
              </div>

              {/* Advanced OAuth Custom Client IDs Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedAuth(!showAdvancedAuth)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showAdvancedAuth ? '▾ Hide Advanced OAuth Credentials' : '▸ Custom OAuth Client IDs (Optional)'}
                </button>
                {showAdvancedAuth && (
                  <div className="mt-1.5 p-2 rounded-lg bg-slate-950/80 border border-white/5 space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-medium mb-0.5">
                        Google Cloud Client ID (Desktop Application)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={googleClientIdDraft}
                          onChange={(e) => setGoogleClientIdDraft(e.target.value)}
                          placeholder="xxxxx.apps.googleusercontent.com"
                          className="flex-1 px-2 py-1 text-[10px] bg-slate-900 border border-white/10 rounded text-slate-200 font-mono focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomGoogleClientId(googleClientIdDraft);
                            useToastStore.getState().showToast('Google Client ID saved', 'success');
                          }}
                          className="px-2 py-1 text-[10px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded border border-sky-400/30 font-medium"
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block font-medium mb-0.5">
                        GitHub OAuth App Client ID
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={clientIdDraft}
                          onChange={(e) => setClientIdDraft(e.target.value)}
                          placeholder="Ov23li..."
                          className="flex-1 px-2 py-1 text-[10px] bg-slate-900 border border-white/10 rounded text-slate-200 font-mono focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomClientId(clientIdDraft);
                            useToastStore.getState().showToast('GitHub Client ID saved', 'success');
                          }}
                          className="px-2 py-1 text-[10px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded border border-sky-400/30 font-medium"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
