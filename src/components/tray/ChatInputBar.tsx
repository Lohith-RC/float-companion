import { FC, FormEvent } from 'react';
import { CornerDownLeft } from 'lucide-react';

interface ChatInputBarProps {
  inputPrompt: string;
  isStreaming: boolean;
  onChangePrompt: (value: string) => void;
  onSubmit: (e?: FormEvent, overridePrompt?: string) => void;
}

/**
 * ChatInputBar
 * Floating command pill with quick suggestion chips and submit controls.
 */
export const ChatInputBar: FC<ChatInputBarProps> = ({
  inputPrompt,
  isStreaming,
  onChangePrompt,
  onSubmit,
}) => {
  const suggestions = [
    { label: '⚡ RAM Status', prompt: 'ram' },
    { label: '🕒 Time', prompt: 'time' },
    { label: '🚀 Open VS Code', prompt: 'open vscode' },
    { label: '📝 Notepad', prompt: 'open notepad' },
  ];

  return (
    <footer className="p-2.5 border-t border-white/[0.08] bg-slate-950/90 backdrop-blur-md space-y-2">
      {/* Quick Suggestions Chips */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar"
        role="group"
        aria-label="Quick Command Suggestions"
      >
        {suggestions.map((chip) => (
          <button
            key={chip.label}
            onClick={() => onSubmit(undefined, chip.prompt)}
            className="px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 text-[10px] font-tabular text-slate-300 hover:text-white rounded-full border border-white/10 transition-all active:scale-95 whitespace-nowrap shadow-sm hover:border-white/20 focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 bg-slate-900/90 border border-white/15 rounded-xl px-3 py-1.5 focus-within:border-sky-500/60 transition-colors shadow-inner"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          placeholder="Ask or command (e.g. 'ram', 'open calc', 'explain async')..."
          aria-label="Ask AI or execute command"
          className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || isStreaming}
          aria-label="Send message or command"
          className="p-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg transition-all active:scale-95 shadow-md shadow-sky-950 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
        >
          <CornerDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </form>
    </footer>
  );
};
