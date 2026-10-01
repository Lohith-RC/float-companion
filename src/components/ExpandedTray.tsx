import { FC, useState, useRef, useEffect } from 'react';
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
  Settings,
  Edit3,
  Copy,
  Check,
  RotateCw,
  Terminal,
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

  // Focus timer state
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load user settings on mount
  useEffect(() => {
    loadSettings().then((s) => {
      setUserSettings(s);
      sounds.setEnabled(s.soundEnabled);
    });
  }, []);

  // Save messages to IndexedDB when they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  // Save tasks to IndexedDB when they change
  useEffect(() => {
    if (tasks.length > 0) {
      saveTasks(tasks);
    }
  }, [tasks]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Load hardware stats if stats tab is active
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
            // Sprint completed!
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

  // Handle Prompt Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputPrompt.trim();
    if (!prompt || isStreaming) return;

    sounds.playClick();
    setInputPrompt('');
    addMessage({ role: 'user', content: prompt });

    try {
      // 1. Try Zero-Token FastRouter first (<10ms)
      const routerResult = await matchLocalIntent(prompt);

      if (routerResult.handled && routerResult.reply) {
        addMessage({
          role: 'assistant',
          content: routerResult.reply,
          isZeroToken: true,
        });
        return;
      }

      // 2. Fall through to Multi-Model Orchestrator (Groq / Gemini / Ollama)
      if (!userSettings) return;

      setIsStreaming(true);
      setStreamingContent('');

      await orchestrator.streamPrompt(
        prompt,
        messages,
        userSettings,
        {
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
        }
      );
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
    if (window.electronAPI?.focus?.start) {
      window.electronAPI.focus.start(25, taskTitle);
    }
  };

  const stopFocusSprint = () => {
    setFocusing(false);
    setSecondsRemaining(25 * 60);
    if (window.electronAPI?.focus?.stop) {
      window.electronAPI.focus.stop();
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none">
      {/* Settings Modal */}
      {settingsOpen && userSettings && (
        <SettingsView
          settings={userSettings}
          onUpdate={(s) => setUserSettings(s)}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Top Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900/60 drag-region">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-slate-200">FloatCompanion</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
            {userSettings?.groqKey ? 'Groq Llama-3.3' : userSettings?.geminiKey ? 'Gemini 2.5' : 'Zero-Token'}
          </span>
        </div>

        {/* Window controls & utility buttons */}
        <div className="flex items-center gap-1.5 no-drag">
          <button
            onClick={onOpenCanvas}
            className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-white/10 rounded transition-colors"
            title="Screen Canvas Overlay (Ctrl+Shift+C)"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded transition-colors"
            title="Settings & API Keys"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
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
                  className={`max-w-[92%] px-3.5 py-2.5 rounded-2xl leading-relaxed text-xs relative group ${
                    msg.role === 'user'
                      ? 'bg-sky-600/90 text-white rounded-tr-sm shadow-md'
                      : 'bg-slate-800/90 text-slate-200 rounded-tl-sm border border-white/10'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.isZeroToken && (
                    <div className="mt-1 text-[10px] text-sky-300/80 font-mono flex items-center gap-1">
                      <span>⚡ 0-Token Deterministic Intent</span>
                    </div>
                  )}

                  {/* Actions for assistant messages */}
                  {msg.role === 'assistant' && (
                    <div className="mt-2 pt-1 border-t border-white/10 flex items-center gap-2 text-[10px] opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyText(msg.content, msg.id)}
                        className="flex items-center gap-1 hover:text-sky-300"
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => handleTypeTextToBackground(msg.content)}
                        className="flex items-center gap-1 hover:text-amber-300 ml-2"
                        title="Type directly into the window behind the Orb"
                      >
                        <Terminal className="w-3 h-3" />
                        <span>Type in Active Window</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live Streaming Message Bubble */}
            {isStreaming && (
              <div className="flex flex-col items-start">
                <div className="max-w-[92%] px-3.5 py-2.5 rounded-2xl bg-slate-800/90 text-slate-200 rounded-tl-sm border border-sky-500/40 text-xs shadow-lg">
                  <div className="whitespace-pre-wrap">{streamingContent || 'Thinking...'}</div>
                  <div className="mt-1 text-[10px] text-sky-400 font-mono flex items-center gap-1 animate-pulse">
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Streaming live tokens...</span>
                  </div>
                </div>
              </div>
            )}

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
            <div
              className={`relative w-36 h-36 flex items-center justify-center rounded-full border-4 ${
                isFocusing
                  ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-pulse'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="text-center">
                <span className="text-3xl font-bold font-mono text-amber-300">
                  {formatTimer(secondsRemaining)}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                  {isFocusing ? 'Sprint Active' : 'Pomodoro Shield'}
                </p>
              </div>
            </div>

            {isFocusing ? (
              <div className="space-y-3 w-full max-w-xs">
                <p className="text-xs text-amber-200">
                  Guarding: <strong>{activeFocusTask || 'Deep Work Session'}</strong>
                </p>
                <button
                  onClick={stopFocusSprint}
                  className="w-full py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-950/40"
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

                {systemStats.storage && (
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                    <span className="text-slate-500 block text-[10px] mb-1">Primary Storage (C:)</span>
                    <div className="flex justify-between text-xs text-slate-300 font-mono">
                      <span>Free: {systemStats.storage[0]?.freeGB} GB</span>
                      <span>Total: {systemStats.storage[0]?.totalGB} GB</span>
                    </div>
                  </div>
                )}
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
            placeholder={
              userSettings?.groqKey || userSettings?.geminiKey
                ? "Ask anything, or 'time', 'ram', 'open notepad'..."
                : "Try 'time', 'ram', 'open vscode', or add API key in ⚙️..."
            }
            className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isStreaming}
            className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
