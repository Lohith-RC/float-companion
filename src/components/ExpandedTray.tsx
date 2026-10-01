import { FC, useState, useRef, useEffect, lazy, Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useToastStore } from '../store/useToastStore';
import { matchLocalIntent } from '../ai/fastRouter';
import { orchestrator, ImageAttachment } from '../ai/orchestrator';
import { sounds } from '../services/soundEffects';
import {
  UserSettings,
  defaultSettings,
  loadSettings,
  saveMessages,
  saveTasks,
} from '../db/indexedDB';
import { SystemStatsResponse } from '../types/electron';
import { getErrorMessage } from '../utils/errorUtils';

// Modular Tray Subcomponents (<150 lines each)
import { TrayHeader } from './tray/TrayHeader';
import { TrayTabsNav } from './tray/TrayTabsNav';
import { ChatTab } from './tray/ChatTab';
import { TasksTab } from './tray/TasksTab';
import { FocusTab } from './tray/FocusTab';
import { StatsTab } from './tray/StatsTab';
import { ChatInputBar } from './tray/ChatInputBar';

// Lazy load Settings Modal to optimize initial bundle size & memory
const SettingsView = lazy(() =>
  import('./SettingsView').then((mod) => ({ default: mod.SettingsView }))
);

interface ExpandedTrayProps {
  onCollapse: () => void;
  onOpenCanvas: () => void;
}

/**
 * ExpandedTray
 * Modular architectural coordinator for the expanded 440x620 desktop companion tray.
 */
export const ExpandedTray: FC<ExpandedTrayProps> = ({ onCollapse, onOpenCanvas }) => {
  const {
    activeTab,
    setActiveTab,
    messages,
    addMessage,
    clearMessages,
    tasks,
    toggleTask,
    addTask,
    removeTask,
    isFocusing,
    startFocus,
    stopFocus,
    selectedSprintDuration,
    focusSecondsRemaining,
    setSelectedDuration,
    activeFocusTask,
    distractionAlert,
    setDistractionAlert,
  } = useAppStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [attachedImage, setAttachedImage] = useState<ImageAttachment | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStatsResponse | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      setUserSettings(s);
      sounds.setEnabled(s.soundEnabled);
    });
  }, []);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (activeTab === 'stats' && window.electronAPI?.os?.getStats) {
      window.electronAPI.os.getStats().then(setSystemStats).catch((err: unknown) => {
        console.error('Failed to query hardware telemetry:', getErrorMessage(err));
      });
    }
  }, [activeTab]);



  const handleCaptureScreen = async () => {
    if (window.electronAPI?.os?.captureScreen) {
      sounds.playClick();
      const res = await window.electronAPI.os.captureScreen();
      if (res.success && res.dataUrl && res.base64Data) {
        setAttachedImage({
          dataUrl: res.dataUrl,
          base64Data: res.base64Data,
          mimeType: res.mimeType || 'image/jpeg',
        });
        sounds.playChime();
      } else {
        useToastStore.getState().showToast(res.error || 'Failed to capture screen.', 'error');
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const prompt = (overridePrompt || inputPrompt).trim();
    if ((!prompt && !attachedImage) || isStreaming) return;

    sounds.playClick();
    setInputPrompt('');
    const currentAttachment = attachedImage;
    setAttachedImage(null);

    const effectivePrompt = prompt || (currentAttachment ? 'Analyze this attached screen capture and identify key information or errors.' : '');
    addMessage({ role: 'user', content: effectivePrompt });

    try {
      if (!currentAttachment) {
        const routerResult = await matchLocalIntent(effectivePrompt);

        if (routerResult.handled) {
          if (routerResult.action === 'clear_chat') {
            clearMessages();
            return;
          }
          if (routerResult.reply) {
            addMessage({
              role: 'assistant',
              content: routerResult.reply,
              isZeroToken: true,
            });
            return;
          }
        }
      }

      const activeSettings = userSettings || defaultSettings;

      setIsStreaming(true);
      setStreamingContent('');

      await orchestrator.streamPrompt(effectivePrompt, messages, activeSettings, {
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
          sounds.playChime();
        },
        onError: (err) => {
          setIsStreaming(false);
          setStreamingContent('');
          addMessage({
            role: 'assistant',
            content: `⚠️ Orchestration error: ${err}. Check your API keys in Settings.`,
          });
          sounds.playAlert();
        },
      }, currentAttachment || undefined);
    } catch (err: unknown) {
      setIsStreaming(false);
      setStreamingContent('');
      addMessage({
        role: 'assistant',
        content: `Error: ${getErrorMessage(err)}`,
      });
    }
  };

  const handleCopyText = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    sounds.playClick();
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleTypeTextToBackground = async (text: string) => {
    sounds.playClick();
    if (window.electronAPI?.os?.typeText) {
      await window.electronAPI.os.typeText(text);
    } else {
      navigator.clipboard.writeText(text);
      useToastStore
        .getState()
        .showToast('Copied to clipboard. Focus your background editor and press Ctrl+V.', 'info');
    }
  };

  const startFocusSprint = (durationMins: number) => {
    sounds.playChime();
    startFocus(durationMins, `Sprint (${durationMins}m)`);
    window.electronAPI?.focus?.start?.(durationMins, `Sprint (${durationMins}m)`);
  };

  const stopFocusSprint = () => {
    sounds.playAlert();
    stopFocus();
    window.electronAPI?.focus?.stop?.();
  };

  return (
    <div className="w-full h-full doppelrand-shell select-none">
      <div className="w-full h-full doppelrand-core flex flex-col overflow-hidden relative">
        {/* Lazy Loaded Settings Modal */}
        {settingsOpen && userSettings && (
          <Suspense fallback={<div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />}>
            <SettingsView
              settings={userSettings}
              onUpdate={(s) => setUserSettings(s)}
              onClose={() => setSettingsOpen(false)}
            />
          </Suspense>
        )}

        {/* Command Header Island */}
        <TrayHeader
          userSettings={userSettings}
          onOpenCanvas={onOpenCanvas}
          onOpenSettings={() => setSettingsOpen(true)}
          onCollapse={onCollapse}
        />

        {/* Distraction Alert Intervention Banner */}
        {distractionAlert?.active && (
          <div
            role="alert"
            className="px-4 py-2 bg-gradient-to-r from-red-950 via-red-900/90 to-red-950 border-b border-red-500/50 text-red-200 text-xs flex items-center justify-between shadow-lg shadow-red-950/50 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 animate-bounce" aria-hidden="true" />
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
        <TrayTabsNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          uncompletedTaskCount={tasks.filter((t) => !t.completed).length}
          isFocusing={isFocusing}
        />

        {/* Tab Content Panes */}
        <main className="flex-1 overflow-y-auto p-3 text-sm">
          {activeTab === 'chat' && (
            <ChatTab
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              copiedId={copiedId}
              onCopyText={handleCopyText}
              onTypeText={handleTypeTextToBackground}
              chatBottomRef={chatBottomRef}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksTab
              tasks={tasks}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onRemoveTask={removeTask}
              onStartFocus={(dur, taskTitle) => {
                startFocus(dur, taskTitle);
                setActiveTab('focus');
                sounds.playChime();
                if (window.electronAPI?.focus?.start) {
                  window.electronAPI.focus.start(dur, taskTitle);
                }
              }}
            />
          )}

          {activeTab === 'focus' && (
            <FocusTab
              isFocusing={isFocusing}
              selectedDuration={selectedSprintDuration}
              secondsRemaining={focusSecondsRemaining}
              activeFocusTask={activeFocusTask}
              onSelectDuration={(dur) => {
                setSelectedDuration(dur);
                sounds.playClick();
              }}
              onStartSprint={startFocusSprint}
              onStopSprint={stopFocusSprint}
            />
          )}

          {activeTab === 'stats' && (
            <StatsTab
              systemStats={systemStats}
              onRefresh={() => {
                if (window.electronAPI?.os?.getStats) {
                  window.electronAPI.os.getStats().then(setSystemStats).catch(console.error);
                }
              }}
            />
          )}
        </main>

        {/* Floating Quick Action Chips & Input Command Bar */}
        {activeTab === 'chat' && (
          <ChatInputBar
            inputPrompt={inputPrompt}
            isStreaming={isStreaming}
            attachedImage={attachedImage}
            onRemoveAttachment={() => setAttachedImage(null)}
            onCaptureScreen={handleCaptureScreen}
            onChangePrompt={setInputPrompt}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
};
