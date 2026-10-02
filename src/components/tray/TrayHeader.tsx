import { FC } from 'react';
import { Sparkles, Edit3, Settings, Minus, X } from 'lucide-react';
import { UserSettings } from '../../db/indexedDB';

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
