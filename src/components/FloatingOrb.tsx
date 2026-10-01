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
    <div
      onClick={onExpand}
      className="w-full h-full flex items-center justify-center cursor-pointer select-none group drag-region relative"
      title="FloatCompanion (Ctrl + Shift + Space)"
    >
      <div className="relative w-[64px] h-[64px] flex items-center justify-center no-drag">
        {/* Ambient Chromatic Glow */}
        <div
          className={`absolute -inset-1.5 rounded-full blur-lg opacity-60 transition-all duration-700 ${
            isDistracted
              ? 'bg-red-500/80 animate-pulse'
              : isFocusing
              ? 'bg-amber-400/60 animate-pulse'
              : 'bg-gradient-to-tr from-sky-500/40 via-indigo-500/30 to-teal-400/40 group-hover:opacity-100 group-hover:scale-110'
          }`}
        />

        {/* Outer Machined Bezel Rim */}
        <div
          className={`relative w-full h-full rounded-full flex items-center justify-center p-[2.5px] transition-all duration-500 ${
            isDistracted
              ? 'bg-gradient-to-b from-red-400 to-red-950 border border-red-500/60 shadow-[0_0_35px_rgba(239,68,68,0.8)]'
              : isFocusing
              ? 'bg-gradient-to-b from-amber-300/70 to-amber-950 border border-amber-400/60 shadow-[0_0_28px_rgba(245,158,11,0.6)]'
              : 'lens-outer-bezel'
          }`}
        >
          {/* Inner Frosted Optical Core */}
          <div className="w-full h-full rounded-full bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center relative overflow-hidden border border-white/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45)]">
            {/* Top Specular Arc Reflection */}
            <div className="absolute top-1 left-2.5 right-2.5 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full pointer-events-none" />

            {/* Dynamic Center Glyphs */}
            {isDistracted ? (
              <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
            ) : isFocusing ? (
              <Brain className="w-5 h-5 text-amber-300 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            ) : (
              <Sparkles className="w-5 h-5 text-sky-300 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]" />
            )}

            {/* Concentric Inner Optical Ring */}
            <div className="absolute inset-1 rounded-full border border-white/[0.06] pointer-events-none" />
          </div>

          {/* Micro-Pip Status Halo */}
          <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center pointer-events-none">
            <span
              className={`absolute w-3.5 h-3.5 rounded-full opacity-60 ${
                isDistracted ? 'bg-red-500 animate-ping' : isFocusing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span
              className={`relative w-2.5 h-2.5 rounded-full border-2 border-slate-950 shadow-sm ${
                isDistracted ? 'bg-red-500' : isFocusing ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
