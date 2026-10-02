import { FC, useState } from 'react';
import { Copy, Check, ExternalLink, Key, RefreshCw, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { sounds } from '../../services/soundEffects';

export const GitHubAuthModal: FC = () => {
  const {
    isModalOpen,
    closeModal,
    deviceFlow,
    isLoading,
    isPolling,
    startDeviceFlow,
    loginWithToken,
  } = useAuthStore();

  const [copied, setCopied] = useState(false);
  const [patInput, setPatInput] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);

  if (!isModalOpen) return null;

  const handleCopyAndOpen = async () => {
    if (!deviceFlow) return;

    try {
      await navigator.clipboard.writeText(deviceFlow.userCode);
      setCopied(true);
      sounds.playClick();
      setTimeout(() => setCopied(false), 2500);

      // Open GitHub verification URI
      const targetUrl = deviceFlow.verificationUri || 'https://github.com/login/device';
      if (window.electronAPI?.auth?.openExternal) {
        await window.electronAPI.auth.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Fallback
      window.open(deviceFlow.verificationUri, '_blank');
    }
  };

  const handlePatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;
    await loginWithToken(patInput);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-auth-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-900/95 border border-white/10 p-5 shadow-2xl text-white overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </div>
          <div>
            <h2 id="github-auth-title" className="text-sm font-semibold text-white tracking-tight">
              Sign in with GitHub
            </h2>
            <p className="text-[11px] text-slate-400">
              100% free • Personalize profile & badges
            </p>
          </div>
        </div>

        {/* Device Flow Presentation */}
        {deviceFlow ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Your One-Time Device Code
              </span>
              <div className="text-2xl font-mono font-extrabold tracking-widest text-sky-400 py-1 select-all">
                {deviceFlow.userCode}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter this code on GitHub to authorize FloatCompanion
              </p>
            </div>

            <button
              onClick={handleCopyAndOpen}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-medium text-xs text-white shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Code Copied! Opening Browser...</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code & Open GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                </>
              )}
            </button>

            {/* Polling Indicator */}
            {isPolling && (
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/5 border border-white/5 text-[11px] text-slate-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Waiting for approval on GitHub...</span>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <p className="text-xs text-slate-400">Contacting GitHub OAuth server...</p>
          </div>
        ) : (
          <div className="py-4 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Authorize FloatCompanion to link your GitHub identity.
            </p>
            <button
              onClick={startDeviceFlow}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 font-medium text-xs text-white shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Start Device Flow</span>
            </button>
          </div>
        )}

        {/* Divider / PAT Option */}
        <div className="mt-4 pt-3 border-t border-white/10">
          {!showPatInput ? (
            <button
              type="button"
              onClick={() => setShowPatInput(true)}
              className="w-full text-center text-[11px] text-slate-400 hover:text-sky-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <Key className="w-3 h-3" />
              <span>Or connect with Personal Access Token</span>
            </button>
          ) : (
            <form onSubmit={handlePatSubmit} className="space-y-2 mt-1">
              <label htmlFor="pat-token-input" className="text-[10px] text-slate-400 block font-medium">
                GitHub Token (<code className="text-sky-300">ghp_...</code> with <code className="text-slate-300">read:user</code>)
              </label>
              <div className="flex gap-1.5">
                <input
                  id="pat-token-input"
                  type="password"
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="flex-1 px-2.5 py-1.5 text-xs bg-slate-950 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  disabled={!patInput.trim() || isLoading}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-xs rounded-lg text-white font-medium transition-colors"
                >
                  Connect
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
