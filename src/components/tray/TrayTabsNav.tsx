import { FC } from 'react';
import { MessageSquare, CheckSquare, Target, Cpu } from 'lucide-react';

interface TrayTabsNavProps {
  activeTab: 'chat' | 'tasks' | 'focus' | 'stats';
  onSelectTab: (tab: 'chat' | 'tasks' | 'focus' | 'stats') => void;
  uncompletedTaskCount: number;
  isFocusing: boolean;
}

/**
 * TrayTabsNav
 * Accessible segmented pill control for switching companion views.
 */
export const TrayTabsNav: FC<TrayTabsNavProps> = ({
  activeTab,
  onSelectTab,
  uncompletedTaskCount,
  isFocusing,
}) => {
  return (
    <nav className="px-3 pt-2 pb-1 bg-slate-950/60 border-b border-white/[0.06]" aria-label="Tray Views">
      <div role="tablist" aria-orientation="horizontal" className="flex bg-slate-900/80 p-1 rounded-xl border border-white/[0.08] text-xs gap-1 shadow-inner">
        <button
          role="tab"
          id="tab-chat"
          aria-selected={activeTab === 'chat'}
          aria-controls="panel-chat"
          onClick={() => onSelectTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
            activeTab === 'chat'
              ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-sm border border-sky-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Chat</span>
        </button>

        <button
          role="tab"
          id="tab-tasks"
          aria-selected={activeTab === 'tasks'}
          aria-controls="panel-tasks"
          onClick={() => onSelectTab('tasks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
            activeTab === 'tasks'
              ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-sm border border-sky-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Tasks</span>
          {uncompletedTaskCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-tabular font-bold">
              {uncompletedTaskCount}
            </span>
          )}
        </button>

        <button
          role="tab"
          id="tab-focus"
          aria-selected={activeTab === 'focus'}
          aria-controls="panel-focus"
          onClick={() => onSelectTab('focus')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
            activeTab === 'focus'
              ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-sm border border-amber-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Target className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Focus</span>
          {isFocusing && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
        </button>

        <button
          role="tab"
          id="tab-stats"
          aria-selected={activeTab === 'stats'}
          aria-controls="panel-stats"
          onClick={() => onSelectTab('stats')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
            activeTab === 'stats'
              ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-sm border border-sky-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Stats</span>
        </button>
      </div>
    </nav>
  );
};
