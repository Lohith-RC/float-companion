import { FC, FormEvent, useState, useEffect } from 'react';
import { CornerDownLeft, Camera, Mic, MicOff, X } from 'lucide-react';
import { ImageAttachment } from '../../ai/orchestrator';
import { sounds } from '../../services/soundEffects';

import { useToastStore } from '../../store/useToastStore';

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface WebkitWindowSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

interface ChatInputBarProps {
  inputPrompt: string;
  isStreaming: boolean;
  attachedImage: ImageAttachment | null;
  onRemoveAttachment: () => void;
  onCaptureScreen: () => void;
  onChangePrompt: (value: string) => void;
  onSubmit: (e?: FormEvent, overridePrompt?: string) => void;
}

/**
 * ChatInputBar
 * Multimodal command bar with Screen Vision capture and hands-free voice dictation.
 */
export const ChatInputBar: FC<ChatInputBarProps> = ({
  inputPrompt,
  isStreaming,
  attachedImage,
  onRemoveAttachment,
  onCaptureScreen,
  onChangePrompt,
  onSubmit,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const speechWin = window as unknown as WebkitWindowSpeech;
      const SpeechConstructor = speechWin.SpeechRecognition || speechWin.webkitSpeechRecognition;
      if (SpeechConstructor) {
        const recog = new SpeechConstructor();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0]?.[0]?.transcript || '';
          if (transcript) {
            onChangePrompt(transcript);
          }
        };

        recog.onerror = () => {
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        setRecognition(recog);
      }
    }
  }, [onChangePrompt]);

  const toggleVoiceMode = () => {
    if (!recognition) {
      useToastStore.getState().showToast('Speech recognition is not supported in this environment.', 'warning');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      sounds.playClick();
    } else {
      try {
        recognition.start();
        setIsListening(true);
        sounds.playChime();
      } catch {
        setIsListening(false);
      }
    }
  };

  const suggestions = [
    { label: '📷 Analyze Screen', action: onCaptureScreen },
    { label: '⚡ RAM Status', prompt: 'ram' },
    { label: '🕒 Time', prompt: 'time' },
    { label: '🚀 Open VS Code', prompt: 'open vscode' },
  ];

  return (
    <footer className="p-2.5 border-t border-white/[0.08] bg-slate-950/90 backdrop-blur-md space-y-2">
      {/* Attached Screenshot Vision Chip */}
      {attachedImage && (
        <div className="flex items-center gap-2 p-1.5 bg-sky-950/60 border border-sky-400/40 rounded-xl text-xs text-sky-200 shadow-sm animate-fade-in">
          <img
            src={attachedImage.dataUrl}
            alt="Screen Vision Thumbnail"
            className="w-10 h-6 object-cover rounded-md border border-white/20"
          />
          <div className="flex-1 truncate">
            <span className="font-semibold text-[11px] block">Screen Vision Attached</span>
            <span className="text-[9px] text-sky-300/80">Gemini 2.5 Flash will inspect this display capture</span>
          </div>
          <button
            onClick={onRemoveAttachment}
            className="p-1 hover:bg-white/10 rounded-md text-sky-300 hover:text-white transition-colors"
            title="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Suggestions Chips */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar"
        role="group"
        aria-label="Quick Command Suggestions"
      >
        {suggestions.map((chip) => (
          <button
            key={chip.label}
            onClick={() => {
              if (chip.action) {
                chip.action();
              } else if (chip.prompt) {
                onSubmit(undefined, chip.prompt);
              }
            }}
            className="px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 text-[10px] font-tabular text-slate-300 hover:text-white rounded-full border border-white/10 transition-all active:scale-95 whitespace-nowrap shadow-sm hover:border-white/20 focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:outline-none flex items-center gap-1"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={onSubmit}
        className={`flex items-center gap-1.5 bg-slate-900/90 border rounded-xl px-2.5 py-1.5 transition-colors shadow-inner ${
          isListening ? 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 'border-white/15 focus-within:border-sky-500/60'
        }`}
      >
        {/* Screen Vision Snap Action */}
        <button
          type="button"
          onClick={onCaptureScreen}
          className="p-1 text-slate-400 hover:text-sky-300 hover:bg-white/10 rounded-lg transition-all active:scale-95"
          title="Snap & Analyze Screen (Ctrl+Shift+S)"
          aria-label="Capture Screen for Vision Analysis"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Voice Dictation Toggle */}
        <button
          type="button"
          onClick={toggleVoiceMode}
          className={`p-1 rounded-lg transition-all active:scale-95 ${
            isListening ? 'text-amber-300 bg-amber-500/20 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title={isListening ? 'Stop Voice Dictation' : 'Start Voice Dictation'}
          aria-label="Toggle Voice Dictation"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          placeholder={
            isListening
              ? 'Listening to speech...'
              : attachedImage
              ? 'Ask anything about this screen snapshot...'
              : "Ask or command (e.g. 'ram', 'open calc')..."
          }
          aria-label="Ask AI or execute command"
          className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
        />

        <button
          type="submit"
          disabled={(!inputPrompt.trim() && !attachedImage) || isStreaming}
          aria-label="Send message or command"
          className="p-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg transition-all active:scale-95 shadow-md shadow-sky-950 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
        >
          <CornerDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </form>
    </footer>
  );
};
