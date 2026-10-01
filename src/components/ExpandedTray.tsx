import { FC, useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  CheckSquare,
  Cpu,
  Target,
  Minus,
  X,
  Sparkles,
  Play,
  Square,
  AlertCircle,
  Settings,
  Edit3,
  Copy,
  Check,
  RotateCw,
  Terminal,
  HardDrive,
  CornerDownLeft,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { matchLocalIntent } from '../ai/fastRouter';
import { orchestrator } from '../ai/orchestrator';
import { sounds } from '../services/soundEffects';
import {
  UserSettings,
  loadSettings,
  saveMessages,
  saveTasks,
  recordFocusSession,
} from '../db/indexedDB';
import { SettingsView } from './SettingsView';

interface ExpandedTrayProps {
  onCollapse: () => void;
  onOpenCanvas: () => void;
}

export const ExpandedTray: FC<ExpandedTrayProps> = ({ onCollapse, onOpenCanvas }) => {
  const {
    activeTab,
    setActiveTab,
    messages,
    addMessage,
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Focus timer state (25 minutes = 1500 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      setUserSettings(s);
      sounds.setEnabled(s.soundEnabled);
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (tasks.length > 0) {
      saveTasks(tasks);
    }
  }, [tasks]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (activeTab === 'stats' && window.electronAPI?.os?.getStats) {
      window.electronAPI.os.getStats().then(setSystemStats).catch(console.error);
    }
  }, [activeTab]);

  // Pomodoro countdown ticker
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isFocusing && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            sounds.playSuccess();
            setFocusing(false);
            recordFocusSession({
              id: Date.now().toString(),
              taskTitle: activeFocusTask || 'Focus Sprint',
              durationMins: 25,
              completedAt: Date.now(),
              distractionsCaught: 0,
            });
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isFocusing, secondsRemaining, activeFocusTask]);

  const handleSubmit = async (e?: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const prompt = (overridePrompt || inputPrompt).trim();
    if (!prompt || isStreaming) return;

    sounds.playClick();
    setInputPrompt('');
    addMessage({ role: 'user', content: prompt });

    try {
      const routerResult = await matchLocalIntent(prompt);

      if (routerResult.handled && routerResult.reply) {
        addMessage({
          role: 'assistant',
          content: routerResult.reply,
          isZeroToken: true,
        });
        return;
      }

      if (!userSettings) return;

      setIsStreaming(true);
      setStreamingContent('');

      await orchestrator.streamPrompt(prompt, messages, userSettings, {
        onChunk: (chunkText) => {
          setStreamingContent(chunkText);
        },
        onDone: (fullText) => {
          setIsStreaming(false);
          setStreamingContent('');
          addMessage({
            role: 'assistant',
            content: fullText,
          });
        },
        onError: (errMsg) => {
          setIsStreaming(false);
          setStreamingContent('');
          addMessage({
            role: 'assistant',
            content: `⚠️ ${errMsg}`,
          });
        },
      });
    } catch (err: any) {
      setIsStreaming(false);
      addMessage({
        role: 'assistant',
        content: `⚠️ Failed to process command: ${err.message}`,
      });
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    sounds.playClick();
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleTypeTextToBackground = async (text: string) => {
    if (window.electronAPI?.os?.typeText) {
      await window.electronAPI.os.typeText(text);
      sounds.playChime();
    }
  };

  const startFocusSprint = (taskTitle: string) => {
    setSecondsRemaining(25 * 60);
    setFocusing(true, taskTitle, 25);
    sounds.playChime();
    if (window.electronAPI?.focus?.startSession) {
      window.electronAPI.focus.startSession({
        durationMinutes: 25,
        taskTitle,
        distractionBlacklist: userSettings?.distractionBlacklist,
      });
    }
  };

  const stopFocusSprint = () => {
    setFocusing(false);
    setSecondsRemaining(25 * 60);
    sounds.playClick();
    if (window.electronAPI?.focus?.stopSession) {
      window.electronAPI.focus.stopSession();
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressFraction = (25 * 60 - secondsRemaining) / (25 * 60);
  const strokeDash = 2 * Math.PI * 54;
  const strokeOffset = strokeDash * (1 - progressFraction);

  return (
    <div className="w-full h-full doppelrand-shell select-none">
      <div className="w-full h-full doppelrand-core flex flex-col overflow-hidden relative">
        {/* Settings Modal */}
        {settingsOpen && userSettings && (
          <SettingsView
            settings={userSettings}
            onUpdate={(s) => setUserSettings(s)}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        {/* Command Header Island */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.08] bg-slate-950/70 drag-region">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-500/25 to-indigo-500/25 border border-sky-400/40 flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.25)]">
              <Sparkles className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-white">FloatCompanion</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-tabular font-medium">
                  READY
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block font-tabular">
                {userSettings?.groqKey ? '⚡ Groq Llama-3.3' : userSettings?.geminiKey ? '✨ Gemini 2.5' : '⚡ 0-Token Native'}
              </span>
            </div>
          </div>

          {/* Nested Button-in-Button Capsule */}
          <div className="flex items-center gap-1.5 no-drag bg-slate-900/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={onOpenCanvas}
              className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-white/10 rounded-lg transition-colors"
              title="Screen Canvas Overlay (Ctrl+Shift+C)"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Settings & Key Vault"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onCollapse}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Collapse to Orb (Esc)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.electronAPI?.window?.close?.() || onCollapse()}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Distraction Alert Intervention Banner */}
        {distractionAlert?.active && (
          <div className="px-4 py-2 bg-gradient-to-r from-red-950 via-red-900/90 to-red-950 border-b border-red-500/50 text-red-200 text-xs flex items-center justify-between shadow-lg shadow-red-950/50 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 animate-bounce" />
              <span>
                Attention Shield: <strong>{distractionAlert.title}</strong>
              </span>
            </div>
            <button
              onClick={() => setDistractionAlert(null)}
              className="px-2.5 py-0.5 bg-red-800 hover:bg-red-700 rounded-full text-[11px] font-medium text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Segmented Pill Switcher Tabs */}
        <div className="px-3 pt-2 pb-1 bg-slate-950/60 border-b border-white/[0.06]">
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/[0.08] text-xs gap-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'chat'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-sm border border-sky-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'tasks'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-sm border border-sky-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-tabular font-bold">
                {tasks.filter((t) => !t.completed).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('focus')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'focus'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-sm border border-amber-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Focus</span>
              {isFocusing && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'stats'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-sm border border-sky-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Stats</span>
            </button>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="flex-1 overflow-y-auto p-3 text-sm">
          {/* TAB 1: Chat Stream */}
          {activeTab === 'chat' && (
            <div className="space-y-3 pb-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] px-3.5 py-2.5 rounded-2xl leading-relaxed text-xs relative group ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-sky-600 to-indigo-600 text-white rounded-tr-sm shadow-md shadow-sky-950/40 border border-sky-400/30'
                        : 'bg-slate-900/90 text-slate-200 rounded-tl-sm border border-white/10 shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.isZeroToken && (
                      <div className="mt-1.5 text-[9px] text-emerald-400 font-tabular font-semibold flex items-center gap-1">
                        <span>⚡ 0-Token Deterministic Intent</span>
                      </div>
                    )}

                    {/* Micro Action Bar */}
                    {msg.role === 'assistant' && (
                      <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center gap-1.5 text-[10px] opacity-75 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyText(msg.content, msg.id)}
                          className="btn-pill-action px-2 py-0.5 rounded-md flex items-center gap-1 text-slate-300 hover:text-white"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => handleTypeTextToBackground(msg.content)}
                          className="btn-pill-action px-2 py-0.5 rounded-md flex items-center gap-1 text-sky-300 hover:text-sky-200"
                          title="Type directly into the window behind the Orb"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>Type in Window</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Live Streaming Indicator */}
              {isStreaming && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[92%] px-3.5 py-2.5 rounded-2xl bg-slate-900/90 text-slate-200 rounded-tl-sm border border-sky-500/40 text-xs shadow-xl">
                    <div className="whitespace-pre-wrap">{streamingContent || 'Synthesizing response...'}</div>
                    <div className="mt-1.5 text-[10px] text-sky-400 font-tabular flex items-center gap-1.5 animate-pulse">
                      <RotateCw className="w-3 h-3 animate-spin" />
                      <span>Streaming tokens via Groq...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          )}

          {/* TAB 2: Task Board */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-white/10">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="New focus task..."
                  className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
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
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Add
                </button>
              </div>

              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-white/[0.06] hover:border-white/20 cursor-pointer transition-all hover:translate-x-0.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => {}}
                        className="rounded border-slate-700 text-sky-500 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span
                        className={`text-xs ${
                          task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-tabular font-medium">{task.durationMins}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Focus Mode Chronograph */}
          {activeTab === 'focus' && (
            <div className="h-full flex flex-col items-center justify-center p-2 text-center space-y-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* SVG Circular Progress Track */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="54"
                    stroke="rgba(245, 158, 11, 0.15)"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="54"
                    stroke={isFocusing ? '#F59E0B' : 'rgba(245, 158, 11, 0.4)'}
                    strokeWidth="6"
                    strokeDasharray={strokeDash}
                    strokeDashoffset={isFocusing ? strokeOffset : 0}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>

                {/* Center Chronograph Digits */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold font-tabular text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                    {formatTimer(secondsRemaining)}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-slate-400 mt-1">
                    {isFocusing ? 'Active Sprint' : 'Deep Work'}
                  </span>
                </div>
              </div>

              {isFocusing ? (
                <div className="space-y-3 w-full max-w-xs">
                  <p className="text-xs text-amber-200">
                    Shielding: <strong>{activeFocusTask || 'Sprint Session'}</strong>
                  </p>
                  <button
                    onClick={stopFocusSprint}
                    className="w-full py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-950/50"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>End Sprint</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 w-full max-w-xs">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Background window monitoring polls every 3s and intercepts distractions.
                  </p>
                  <button
                    onClick={() => startFocusSprint('Focus Sprint #1')}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all hover:scale-[1.02]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start 25-Min Focus Sprint</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Hardware Telemetry */}
          {activeTab === 'stats' && (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Operating System Telemetry</span>
                <button
                  onClick={() => window.electronAPI?.os?.getStats?.().then(setSystemStats)}
                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-tabular"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {systemStats ? (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Memory Load</span>
                      <span className="font-tabular font-semibold text-sky-300">
                        {systemStats.memory.usedGB} GB / {systemStats.memory.totalGB} GB ({systemStats.memory.usagePercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-white/5">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-700"
                        style={{ width: `${systemStats.memory.usagePercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/10">
                      <span className="text-slate-500 block text-[10px] font-tabular">Available RAM</span>
                      <span className="font-tabular text-slate-100 font-bold text-sm">{systemStats.memory.freeGB} GB</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/10">
                      <span className="text-slate-500 block text-[10px] font-tabular">Platform</span>
                      <span className="font-tabular text-slate-100 font-bold text-sm uppercase">{systemStats.platform}</span>
                    </div>
                  </div>

                  {systemStats.storage && (
                    <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="text-slate-200 block text-xs font-semibold">Primary Drive (C:)</span>
                          <span className="text-[10px] text-slate-400 font-tabular font-medium">
                            {systemStats.storage[0]?.freeGB} GB free of {systemStats.storage[0]?.totalGB} GB
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-tabular text-emerald-400 font-bold">HEALTHY</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 font-tabular animate-pulse">
                  Querying native Win32 hardware telemetry...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Quick Action Chips & Input Command Bar */}
        {activeTab === 'chat' && (
          <div className="p-2.5 border-t border-white/[0.08] bg-slate-950/80 space-y-2">
            {/* Quick Suggestions Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {[
                { label: '⚡ RAM Status', prompt: 'ram' },
                { label: '🕒 Time', prompt: 'time' },
                { label: '🚀 Open VS Code', prompt: 'open vscode' },
                { label: '📝 Notepad', prompt: 'open notepad' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleSubmit(undefined, chip.prompt)}
                  className="px-2 py-0.5 bg-slate-900/80 hover:bg-slate-800 text-[10px] font-tabular text-slate-300 hover:text-white rounded-full border border-white/10 transition-colors whitespace-nowrap"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-slate-900/90 border border-white/15 rounded-xl px-3 py-1.5 focus-within:border-sky-500/60 transition-colors shadow-inner">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask or command (e.g. 'ram', 'open calc', 'explain async')..."
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isStreaming}
                className="p-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg transition-all active:scale-95 shadow-md shadow-sky-950"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
