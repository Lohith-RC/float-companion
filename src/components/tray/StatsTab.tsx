import { FC } from 'react';
import { RotateCw, HardDrive } from 'lucide-react';
import { SystemStatsResponse } from '../../types/electron';

interface StatsTabProps {
  systemStats: SystemStatsResponse | null;
  onRefresh: () => void;
}

/**
 * StatsTab
 * Native OS telemetry dashboard displaying CPU/RAM metrics and drive health.
 */
export const StatsTab: FC<StatsTabProps> = ({ systemStats, onRefresh }) => {
  return (
    <section
      role="tabpanel"
      id="panel-stats"
      aria-labelledby="tab-stats"
      className="space-y-3 p-1"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-200 m-0">Operating System Telemetry</h2>
        <button
          onClick={onRefresh}
          className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-tabular focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:outline-none"
        >
          <RotateCw className="w-3 h-3" aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {systemStats ? (
        <div className="space-y-2">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-1.5 shadow-inner">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Memory Load</span>
              <span className="font-tabular font-semibold text-sky-300">
                {systemStats.memory.usedGB} GB / {systemStats.memory.totalGB} GB ({systemStats.memory.usagePercent}%)
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={systemStats.memory.usagePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="RAM Usage Percentage"
              className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-white/5"
            >
              <div
                className="bg-gradient-to-r from-sky-500 via-indigo-500 to-teal-400 h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                style={{ width: `${systemStats.memory.usagePercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/10 shadow-inner">
              <span className="text-slate-500 block text-[10px] font-tabular">Available RAM</span>
              <span className="font-tabular text-slate-100 font-bold text-sm">{systemStats.memory.freeGB} GB</span>
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/10 shadow-inner">
              <span className="text-slate-500 block text-[10px] font-tabular">Platform</span>
              <span className="font-tabular text-slate-100 font-bold text-sm uppercase">{systemStats.platform}</span>
            </div>
          </div>

          {systemStats.storage && systemStats.storage.length > 0 && (
            <div className="space-y-2">
              {systemStats.storage.map((drive) => {
                const usedGB = Math.max(0, drive.totalGB - drive.freeGB);
                const percentUsed = drive.totalGB > 0 ? Math.round((usedGB / drive.totalGB) * 100) : 0;
                return (
                  <div
                    key={drive.drive}
                    className="p-2.5 bg-slate-900/60 rounded-xl border border-white/10 shadow-inner space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        <span className="text-slate-200 text-xs font-semibold">
                          Drive {drive.drive}
                        </span>
                      </div>
                      <span className="text-xs font-tabular text-emerald-400 font-bold">
                        {drive.freeGB} GB free
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-tabular">
                      <span>{usedGB} GB used</span>
                      <span>{drive.totalGB} GB total ({percentUsed}%)</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={percentUsed}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Drive ${drive.drive} Storage Percentage`}
                      className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/5"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentUsed > 90
                            ? 'bg-red-500'
                            : percentUsed > 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-xs text-slate-500 font-tabular animate-pulse">
          Querying native Win32 hardware telemetry...
        </div>
      )}
    </section>
  );
};
