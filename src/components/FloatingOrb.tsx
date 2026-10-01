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
      className="w-full h-full flex items-center justify-center cursor-pointer select-none group"
      title="Click or press Ctrl+Shift+Space to open FloatCompanion"
    >
      <div
        className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300 ${
          isDistracted
            ? 'bg-red-950/80 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse'
            : isFocusing
            ? 'bg-amber-950/70 border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-breathe'
            : 'glass-orb group-hover:scale-105 transition-transform'
        }`}
      >
        {/* Core Icon */}
        {isDistracted ? (
          <AlertTriangle className="w-6 h-6 text-red-400 animate-bounce" />
        ) : isFocusing ? (
          <Brain className="w-6 h-6 text-amber-300" />
        ) : (
          <Sparkles className="w-6 h-6 text-sky-300 group-hover:rotate-12 transition-transform duration-300" />
        )}

        {/* Live Status Pip */}
        <span
          className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
            isDistracted ? 'bg-red-500 animate-ping' : isFocusing ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
        />
      </div>
    </div>
  );
};
