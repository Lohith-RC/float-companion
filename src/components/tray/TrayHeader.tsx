import { FC } from 'react';
import { Sparkles, Edit3, Settings, Minus, X } from 'lucide-react';
import { UserSettings } from '../../db/indexedDB';
import { useAuthStore } from '../../store/useAuthStore';

interface TrayHeaderProps {
  userSettings: UserSettings | null;
  onOpenCanvas: () => void;
  onOpenSettings: () => void;
  onCollapse: () => void;
}

/**
 * TrayHeader
 * High-precision command header island with dynamic model readout and window actions.
 */
export const TrayHeader: FC<TrayHeaderProps> = ({
  userSettings,
  onOpenCanvas,
  onOpenSettings,
  onCollapse,
}) => {
  const { user, openModal } = useAuthStore();
  const activeEngineLabel = (() => {
    const pref = userSettings?.defaultModel || 'groq';
    if (pref === 'gemini' && userSettings?.geminiKey) {
      return '✨ Gemini 2.5 Flash';
    }
    if (pref === 'ollama') {
      return '🦙 Ollama Local';
    }
    if (userSettings?.groqKey) {
      return '⚡ Groq Llama-3.3';
    }
    if (userSettings?.geminiKey) {
      return '✨ Gemini 2.5 Flash';
    }
    return '⚡ 0-Token Native';
  })();

  return (
    <header className="h-14 px-4 flex items-center justify-between border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-xl drag-region">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500/25 via-indigo-500/20 to-teal-400/20 border border-sky-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.25)] relative overflow-hidden">
          <div className="absolute top-0.5 left-1 right-1 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <Sparkles className="w-4 h-4 text-sky-300" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs font-bold tracking-tight text-white m-0">FloatCompanion</h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-tabular font-medium">
              READY
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block font-tabular">
            {activeEngineLabel}
          </span>
        </div>
      </div>

      {/* Button-in-Button Header Cluster */}
      <nav aria-label="Window Controls" className="flex items-center gap-1 no-drag bg-slate-900/70 p-1 rounded-xl border border-white/10 shadow-inner">
        {/* GitHub OAuth Identity Pill */}
        {user ? (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[11px] group border border-white/5"
            title={`Connected as @${user.login} (${user.name || user.login})`}
            aria-label={`GitHub profile: ${user.login}`}
          >
            <div className="relative">
              <img
                src={user.avatarUrl}
                alt={user.login}
                className="w-4 h-4 rounded-full border border-sky-400/40 object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-slate-900" />
            </div>
            <span className="font-medium text-[10px] hidden sm:inline max-w-[70px] truncate">
              {user.login}
            </span>
          </button>
        ) : (
          <button
            onClick={openModal}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-white/10 transition-all text-[10px]"
            title="Sign in with GitHub (Free OAuth)"
            aria-label="Sign in with GitHub"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}
        <button
          onClick={onOpenCanvas}
          className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-white/10 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          title="Screen Canvas Overlay (Ctrl+Shift+C)"
          aria-label="Screen Canvas Overlay"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          title="Settings & Key Vault"
          aria-label="Settings and Key Vault"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onCollapse}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          title="Collapse to Orb (Esc)"
          aria-label="Collapse to Orb"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.electronAPI?.window?.close?.() || onCollapse()}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
          title="Dismiss"
          aria-label="Dismiss Window"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </nav>
    </header>
  );
};
