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
      className="w-full h-full flex items-center justify-center cursor-pointer select-none group drag-region"
      title="Click or press Ctrl+Shift+Space to summon FloatCompanion"
    >
      {/* Outer Halo Ambient Diffuser */}
      <div className="relative w-[62px] h-[62px] flex items-center justify-center no-drag">
        {/* Ambient Glow Aura */}
        <div
          className={`absolute -inset-1 rounded-full blur-md opacity-60 transition-all duration-700 ${
            isDistracted
              ? 'bg-red-500/80 animate-pulse'
              : isFocusing
              ? 'bg-amber-400/60 animate-pulse'
              : 'bg-gradient-to-tr from-sky-400/40 via-indigo-500/30 to-teal-400/40 group-hover:opacity-100 group-hover:scale-110'
          }`}
        />

        {/* Machined Bezel Enclosure (Doppelrand Optical Lens) */}
        <div
          className={`relative w-full h-full rounded-full flex items-center justify-center p-[2px] transition-all duration-500 ${
            isDistracted
              ? 'bg-gradient-to-b from-red-400 to-red-950 border border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.7)]'
              : isFocusing
              ? 'bg-gradient-to-b from-amber-300/60 to-amber-950 border border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
              : 'lens-outer-bezel'
          }`}
        >
          {/* Inner Caustic Lens Core */}
          <div className="w-full h-full rounded-full bg-slate-950/85 backdrop-blur-xl flex items-center justify-center relative overflow-hidden border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
            {/* Subtle Caustic Shimmer Light Sweep */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-70 group-hover:rotate-45 transition-transform duration-700 pointer-events-none" />

            {/* Core Morphing Icon */}
            {isDistracted ? (
              <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
            ) : isFocusing ? (
              <Brain className="w-5 h-5 text-amber-300 animate-pulse" />
            ) : (
              <Sparkles className="w-5 h-5 text-sky-300 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
            )}

            {/* Specular Rim Arc (Top Highlight) */}
            <div className="absolute top-1 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full" />
          </div>

          {/* Micro-Pip Status Halo */}
          <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
            <span
              className={`absolute w-3.5 h-3.5 rounded-full opacity-60 ${
                isDistracted ? 'bg-red-500 animate-ping' : isFocusing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span
              className={`relative w-2.5 h-2.5 rounded-full border border-slate-950 ${
                isDistracted ? 'bg-red-500' : isFocusing ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
