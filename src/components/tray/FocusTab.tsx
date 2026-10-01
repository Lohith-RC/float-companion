import { FC } from 'react';
import { Play, Square } from 'lucide-react';

interface FocusTabProps {
  isFocusing: boolean;
  selectedDuration: number;
  secondsRemaining: number;
  activeFocusTask: string;
  onSelectDuration: (dur: number) => void;
  onStartSprint: (durationMins: number) => void;
  onStopSprint: () => void;
}

/**
 * FocusTab
 * Chronograph sprint controller for distraction-free deep work.
 */
export const FocusTab: FC<FocusTabProps> = ({
  isFocusing,
  selectedDuration,
  secondsRemaining,
  activeFocusTask,
  onSelectDuration,
  onStartSprint,
  onStopSprint,
}) => {
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSprintSecs = selectedDuration * 60;
  const progressFraction = (totalSprintSecs - secondsRemaining) / totalSprintSecs;
  const strokeDash = 2 * Math.PI * 54;
  const strokeOffset = strokeDash * (1 - progressFraction);

  return (
    <section
      role="tabpanel"
      id="panel-focus"
      aria-labelledby="tab-focus"
      className="h-full flex flex-col items-center justify-center p-2 text-center space-y-4"
    >
      {/* Duration Preset Pills */}
      {!isFocusing && (
        <div className="flex items-center gap-1 bg-slate-900/70 p-1 rounded-xl border border-white/10 shadow-inner" role="group" aria-label="Sprint duration options">
          {[15, 25, 45, 60].map((dur) => (
            <button
              key={dur}
              onClick={() => onSelectDuration(dur)}
              className={`px-3 py-1 rounded-lg text-[11px] font-tabular font-semibold transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
                selectedDuration === dur
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {dur}m
            </button>
          ))}
        </div>
      )}

      <div className="relative w-44 h-44 flex items-center justify-center">
        {/* SVG Circular Progress Track */}
        <svg className="w-full h-full transform -rotate-90" aria-hidden="true">
          <circle
            cx="88"
            cy="88"
            r="54"
            stroke="rgba(245, 158, 11, 0.15)"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="88"
            cy="88"
            r="54"
            stroke={isFocusing ? '#F59E0B' : 'rgba(245, 158, 11, 0.4)'}
            strokeWidth="6"
            strokeDasharray={strokeDash}
            strokeDashoffset={isFocusing ? strokeOffset : 0}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(245,158,11,0.5)]"
          />
        </svg>

        {/* Center Chronograph Digits */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-extrabold font-tabular text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
            aria-live="polite"
          >
            {formatTimer(secondsRemaining)}
          </span>
          <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-slate-400 mt-1">
            {isFocusing ? 'Active Sprint' : `${selectedDuration}m Session`}
          </span>
        </div>
      </div>

      {isFocusing ? (
        <div className="space-y-3 w-full max-w-xs">
          <p className="text-xs text-amber-200">
            Shielding: <strong>{activeFocusTask || 'Sprint Session'}</strong>
          </p>
          <button
            onClick={onStopSprint}
            className="w-full py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
          >
            <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>End Sprint</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3 w-full max-w-xs">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Background window monitoring polls every 3s and intercepts distractions.
          </p>
          <button
            onClick={() => onStartSprint(selectedDuration)}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>Start {selectedDuration}-Min Sprint</span>
          </button>
        </div>
      )}
    </section>
  );
};
