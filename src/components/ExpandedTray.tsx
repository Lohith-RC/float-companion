import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  CheckSquare,
  Cpu,
  Target,
  Minus,
  X,
  Send,
  Sparkles,
  Play,
  Square,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { matchLocalIntent } from '../ai/fastRouter';

interface ExpandedTrayProps {
  onCollapse: () => void;
}

export const ExpandedTray: React.FC<ExpandedTrayProps> = ({ onCollapse }) => {
  const {
    activeTab,
    setActiveTab,
    messages,
    addMessage,
    clearMessages,
    tasks,
    toggleTask,
    addTask,
    isFocusing,
    setFocusing,
    activeFocusTask,
    distractionAlert,
    setDistractionAlert,
  } = useAppStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [systemStats, setSystemStats] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load hardware stats if stats tab is active
  useEffect(() => {
    if (activeTab === 'stats' && window.electronAPI?.os?.getStats) {
      window.electronAPI.os.getStats().then(setSystemStats).catch(console.error);
    }
  }, [activeTab]);

  // Handle Prompt Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputPrompt.trim();
    if (!prompt || isSubmitting) return;

    setInputPrompt('');
    addMessage({ role: 'user', content: prompt });
    setIsSubmitting(true);

    try {
      // 1. Try Zero-Token FastRouter
      const routerResult = await matchLocalIntent(prompt);

      if (routerResult.handled && routerResult.reply) {
        addMessage({
          role: 'assistant',
          content: routerResult.reply,
          isZeroToken: true,
        });
      } else {
        // Fallback simulated AI answer or Groq
        addMessage({
          role: 'assistant',
          content: `🤖 **AI Orchestrator (${prompt}):**\n\nI processed your request using the multi-model pipeline. In upcoming Phase 4, your configured Groq \`llama-3.3-70b\` key will stream this answer live. For zero-token native control, try typing \`"time"\`, \`"ram"\`, or \`"open notepad"\`!`,
        });
      }
    } catch (err: any) {
      addMessage({
        role: 'assistant',
        content: `⚠️ Error executing command: ${err.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startFocusSprint = (taskTitle: string) => {
    setFocusing(true, taskTitle, 25);
    if (window.electronAPI?.focus?.start) {
      window.electronAPI.focus.start(25, taskTitle);
    }
  };

  const stopFocusSprint = () => {
    setFocusing(false);
    if (window.electronAPI?.focus?.stop) {
      window.electronAPI.focus.stop();
    }
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none">
      {/* Top Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900/60 drag-region">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-slate-200">FloatCompanion</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
            v1.0.0
          </span>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1.5 no-drag">
          <button
            onClick={onCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded transition-colors"
            title="Collapse to Orb (Esc)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.window?.close?.() || onCollapse()}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Distraction Alert Banner */}
      {distractionAlert?.active && (
        <div className="px-4 py-2 bg-red-950/90 border-b border-red-500/40 text-red-200 text-xs flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              Distraction detected: <strong>{distractionAlert.title}</strong>
            </span>
          </div>
          <button
            onClick={() => setDistractionAlert(null)}
            className="px-2 py-0.5 bg-red-800/60 rounded text-[11px] hover:bg-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-white/10 bg-slate-950/40 px-2 pt-1 gap-1 text-xs">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all ${
            activeTab === 'chat'
              ? 'bg-slate-800/80 text-sky-300 border-t-2 border-sky-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all ${
            activeTab === 'tasks'
              ? 'bg-slate-800/80 text-sky-300 border-t-2 border-sky-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Tasks ({tasks.filter((t) => !t.completed).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('focus')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all ${
            activeTab === 'focus'
              ? 'bg-slate-800/80 text-amber-300 border-t-2 border-amber-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Focus {isFocusing && '●'}</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all ${
            activeTab === 'stats'
              ? 'bg-slate-800/80 text-sky-300 border-t-2 border-sky-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>System</span>
        </button>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 overflow-y-auto p-3 text-sm">
        {/* 1. Chat Tab */}
        {activeTab === 'chat' && (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl leading-relaxed text-xs ${
                    msg.role === 'user'
                      ? 'bg-sky-600/90 text-white rounded-tr-sm shadow-md'
                      : 'bg-slate-800/90 text-slate-200 rounded-tl-sm border border-white/10'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.isZeroToken && (
                    <div className="mt-1 text-[10px] text-sky-300/80 font-mono flex items-center gap-1">
                      <span>⚡ 0-Token Local Intent</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        )}

        {/* 2. Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add execution task..."
                className="flex-1 bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskTitle.trim()) {
                    addTask(newTaskTitle.trim());
                    setNewTaskTitle('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newTaskTitle.trim()) {
                    addTask(newTaskTitle.trim());
                    setNewTaskTitle('');
                  }
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium"
              >
                Add
              </button>
            </div>

            <div className="space-y-1.5 mt-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-white/5 hover:border-white/20 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {}}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0"
                    />
                    <span
                      className={`text-xs ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">{task.durationMins}m</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Focus Guardian Tab */}
        {activeTab === 'focus' && (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-4">
            <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-4 border-amber-500/30 bg-amber-500/5">
              <div className="text-center">
                <span className="text-3xl font-bold font-mono text-amber-300">
                  {isFocusing ? '25:00' : '25m'}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                  {isFocusing ? 'Sprint Active' : 'Pomodoro Shield'}
                </p>
              </div>
            </div>

            {isFocusing ? (
              <div className="space-y-3 w-full max-w-xs">
                <p className="text-xs text-amber-200">
                  Monitoring: <strong>{activeFocusTask || 'Deep Work Session'}</strong>
                </p>
                <button
                  onClick={stopFocusSprint}
                  className="w-full py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>End Sprint</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 w-full max-w-xs">
                <p className="text-xs text-slate-400">
                  Actively polls background windows every 3s and shields you from distraction sites.
                </p>
                <button
                  onClick={() => startFocusSprint('Focus Sprint #1')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start 25-Min Focus Sprint</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. System Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-3 p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Native Hardware Telemetry</span>
              <button
                onClick={() => window.electronAPI?.os?.getStats?.().then(setSystemStats)}
                className="text-[11px] text-sky-400 hover:underline"
              >
                Refresh
              </button>
            </div>

            {systemStats ? (
              <div className="space-y-2">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>RAM Utilization</span>
                    <span className="font-mono text-sky-300">
                      {systemStats.memory.usedGB} GB / {systemStats.memory.totalGB} GB ({systemStats.memory.usagePercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${systemStats.memory.usagePercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                    <span className="text-slate-500 block text-[10px]">Free RAM</span>
                    <span className="font-mono text-slate-200 font-semibold">{systemStats.memory.freeGB} GB</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                    <span className="text-slate-500 block text-[10px]">System Platform</span>
                    <span className="font-mono text-slate-200 font-semibold uppercase">{systemStats.platform}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                <span>Querying native operating system telemetry...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Prompt Bar (Only on Chat tab) */}
      {activeTab === 'chat' && (
        <form onSubmit={handleSubmit} className="p-2.5 border-t border-white/10 bg-slate-950/60 flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask or command (e.g. 'ram', 'open vscode', 'time')..."
            className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isSubmitting}
            className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
