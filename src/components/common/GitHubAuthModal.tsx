import { FC, useState } from 'react';
import { Copy, Check, ExternalLink, Key, RefreshCw, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { sounds } from '../../services/soundEffects';

export const GitHubAuthModal: FC = () => {
  const {
    isModalOpen,
    closeModal,
    activeAuthTab,
    setActiveAuthTab,
    deviceFlow,
    isLoading,
    isPolling,
    isGoogleLoading,
    isMicrosoftLoading,
    startDeviceFlow,
    startGoogleOAuth,
    startMicrosoftOAuth,
    loginWithToken,
  } = useAuthStore();

  const [copied, setCopied] = useState(false);
  const [patInput, setPatInput] = useState('');

  if (!isModalOpen) return null;

  const handleCopyAndOpen = async () => {
    if (!deviceFlow) return;

    try {
      await navigator.clipboard.writeText(deviceFlow.userCode);
      setCopied(true);
      sounds.playClick();
      setTimeout(() => setCopied(false), 2500);

      const targetUrl = deviceFlow.verificationUri || 'https://github.com/login/device';
      if (window.electronAPI?.auth?.openExternal) {
        await window.electronAPI.auth.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
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
      aria-labelledby="auth-modal-title"
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
            {activeAuthTab === 'google' ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            ) : activeAuthTab === 'microsoft' ? (
              <svg className="w-5 h-5" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            )}
          </div>
          <div>
            <h2 id="auth-modal-title" className="text-sm font-semibold text-white tracking-tight">
              Connect Account (Free OAuth)
            </h2>
            <p className="text-[11px] text-slate-400">
              Personalize your copilot avatar and badge
            </p>
          </div>
        </div>

        {/* Provider Tabs (Google, GitHub, Microsoft) */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/70 rounded-xl border border-white/10 mb-4">
          <button
            type="button"
            onClick={() => setActiveAuthTab('google')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              activeAuthTab === 'google'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24">
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
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAuthTab('github')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              activeAuthTab === 'github'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAuthTab('microsoft')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              activeAuthTab === 'microsoft'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            <span>Microsoft</span>
          </button>
        </div>

        {/* MICROSOFT TAB CONTENT */}
        {activeAuthTab === 'microsoft' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Microsoft Account & Entra ID
              </span>
              <p className="text-xs text-slate-300">
                Sign in with personal @outlook / @hotmail or Microsoft 365.
              </p>
            </div>

            <button
              onClick={() => startMicrosoftOAuth()}
              disabled={isMicrosoftLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 font-semibold text-xs text-white shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isMicrosoftLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Waiting for Microsoft in browser...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  <span>Continue with Microsoft</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-500 text-center">
              Runs via native local loopback with PKCE security.
            </p>
          </div>
        )}

        {/* GOOGLE TAB CONTENT */}
        {activeAuthTab === 'google' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Official Google Identity
              </span>
              <p className="text-xs text-slate-300">
                Sign in with your Google account via native browser loopback.
              </p>
            </div>

            <button
              onClick={() => startGoogleOAuth()}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 font-semibold text-xs text-slate-900 shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                  <span>Waiting for Google in browser...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-500 text-center">
              Requires standard Google Cloud Desktop App Client ID configured in Settings.
            </p>
          </div>
        )}

        {/* GITHUB TAB CONTENT */}
        {activeAuthTab === 'github' && (
          <div className="space-y-4 animate-fade-in">
            {deviceFlow ? (
              <div className="space-y-3">
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

                {isPolling && (
                  <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/5 border border-white/5 text-[11px] text-slate-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    <span>Waiting for approval on GitHub...</span>
                  </div>
                )}
              </div>
            ) : isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                <p className="text-xs text-slate-400">Connecting to GitHub...</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <button
                  onClick={startDeviceFlow}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 font-medium text-xs text-white shadow-md flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Start GitHub Device Flow</span>
                </button>
              </div>
            )}

            {/* Instant Free Token Section */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  <span>Instant Token Connect (100% Free)</span>
                </span>
                <a
                  href="https://github.com/settings/tokens/new?scopes=read:user&description=FloatCompanion"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-medium"
                  onClick={(e) => {
                    if (window.electronAPI?.auth?.openExternal) {
                      e.preventDefault();
                      window.electronAPI.auth.openExternal('https://github.com/settings/tokens/new?scopes=read:user&description=FloatCompanion');
                    }
                  }}
                >
                  <span>Generate on GitHub</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <form onSubmit={handlePatSubmit} className="flex gap-1.5">
                <input
                  id="pat-token-input"
                  type="password"
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="flex-1 px-2.5 py-1.5 text-xs bg-slate-950 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-sky-400 font-mono"
                />
                <button
                  type="submit"
                  disabled={!patInput.trim() || isLoading}
                  className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-xs rounded-lg text-white font-medium transition-all shadow-sm"
                >
                  Connect
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
