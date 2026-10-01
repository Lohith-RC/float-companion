import { FC } from 'react';
import { Sparkles, Brain, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface FloatingOrbProps {
  onExpand: () => void;
}

export const FloatingOrb: FC<FloatingOrbProps> = ({ onExpand }) => {
  const { isFocusing, distractionAlert } = useAppStore();
  const isDistracted = Boolean(distractionAlert?.active);

  return (
    <button
      type="button"
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand();
        }
      }}
      aria-label={`FloatCompanion Orb: ${
        isDistracted ? 'Distraction Alert Active' : isFocusing ? 'Focus Sprint In Progress' : 'Ready'
      }. Press Enter or Space to open tray.`}
      className="w-full h-full flex items-center justify-center cursor-pointer select-none group drag-region relative bg-transparent border-0 p-0 m-0 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-full"
      title="FloatCompanion (Ctrl + Shift + Space)"
    >
      <div className="relative w-[66px] h-[66px] flex items-center justify-center">
        {/* Sonar Acoustic Pulse Wave (Expanding Ambient Halo) */}
        <div
          className={`absolute inset-0 rounded-full pointer-events-none opacity-40 animate-sonar ${
            isDistracted
              ? 'bg-red-500/50'
              : isFocusing
              ? 'bg-amber-400/40'
              : 'bg-sky-400/30'
          }`}
        />

        {/* Ambient Chromatic Core Glow */}
        <div
          className={`absolute -inset-1 rounded-full blur-xl opacity-75 transition-all duration-700 pointer-events-none ${
            isDistracted
              ? 'bg-red-500/80 animate-pulse'
              : isFocusing
              ? 'bg-amber-400/60 animate-pulse'
              : 'bg-gradient-to-tr from-sky-500/50 via-indigo-500/40 to-teal-400/50 group-hover:opacity-100 group-hover:scale-115'
          }`}
        />

        {/* Rotating Caustic Sheen Ring */}
        <div className="absolute inset-[-2px] rounded-full overflow-hidden pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500">
          <div
            className={`w-full h-full rounded-full animate-spin-slow ${
              isDistracted
                ? 'bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(239,68,68,0.8)_360deg)]'
                : isFocusing
                ? 'bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(245,158,11,0.8)_360deg)]'
                : 'bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(56,189,248,0.85)_360deg)]'
            }`}
          />
        </div>

        {/* Outer Machined Bezel Rim (Doppelrand Outer Shell) */}
        <div
          className={`relative w-full h-full rounded-full flex items-center justify-center p-[2.5px] transition-all duration-300 active:scale-95 shadow-2xl ${
            isDistracted
              ? 'bg-gradient-to-b from-red-400 via-red-800 to-red-950 border border-red-500/80 shadow-[0_0_35px_rgba(239,68,68,0.8)]'
              : isFocusing
              ? 'bg-gradient-to-b from-amber-300 via-amber-700 to-amber-950 border border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.7)]'
              : 'lens-outer-bezel'
          }`}
        >
          {/* Inner Frosted Optical Core (Doppelrand Core) */}
          <div className="w-11 h-11 rounded-full bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center relative overflow-hidden border border-white/20 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.8)] no-drag">
            {/* Top Specular Arc Reflection */}
            <div className="absolute top-1 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-white/70 to-transparent rounded-full pointer-events-none" />

            {/* Bottom Subtle Ground Bounce Glow */}
            <div className="absolute bottom-1 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent rounded-full pointer-events-none" />

            {/* Dynamic Center Glyphs */}
            {isDistracted ? (
              <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            ) : isFocusing ? (
              <Brain className="w-5 h-5 text-amber-300 animate-pulse drop-shadow-[0_0_10px_rgba(245,158,11,0.7)]" />
            ) : (
              <Sparkles className="w-5 h-5 text-sky-300 group-hover:scale-115 group-hover:rotate-12 transition-all duration-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
            )}

            {/* Concentric Inner Optical Ring */}
            <div className="absolute inset-1 rounded-full border border-white/[0.08] pointer-events-none" />
          </div>

          {/* Micro-Pip Status Halo */}
          <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center pointer-events-none">
            <span
              className={`absolute w-3.5 h-3.5 rounded-full opacity-60 ${
                isDistracted ? 'bg-red-500 animate-ping' : isFocusing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span
              className={`relative w-2.5 h-2.5 rounded-full border-2 border-slate-950 shadow-md ${
                isDistracted ? 'bg-red-500' : isFocusing ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
          </div>
        </div>
      </div>
    </button>
  );
};
