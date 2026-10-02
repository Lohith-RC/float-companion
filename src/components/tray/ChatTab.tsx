import { FC, RefObject } from 'react';
import { Copy, Check, Terminal, Zap, RotateCw, Sparkles, Keyboard, Lightbulb } from 'lucide-react';
import { ChatMessage } from '../../store/useAppStore';

interface ChatTabProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  copiedId: string | null;
  onCopyText: (content: string, id: string) => void;
  onTypeText: (text: string) => void;
  chatBottomRef: RefObject<HTMLDivElement | null>;
}

/**
 * Formats basic Markdown structures (code chips, bold text, links, bullets) into accessible JSX elements
 */
function renderFormattedContent(rawText: string) {
  const lines = rawText.split('\n');

  return lines.map((line, lineIdx) => {
    // Check if line is bullet list item
    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
    const displayLine = isBullet ? line.trim().substring(2) : line;

    // Tokenize line for inline backticks, bold, and links
    const tokens: Array<React.ReactNode> = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(displayLine)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(displayLine.substring(lastIndex, match.index));
      }

      const matchStr = match[0];
      if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
        tokens.push(
          <code
            key={`${lineIdx}-${match.index}`}
            className="px-1.5 py-0.5 rounded bg-slate-950/70 text-sky-300 font-mono text-[11px] border border-white/10"
          >
            {matchStr.slice(1, -1)}
          </code>
        );
      } else if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
        tokens.push(
          <strong key={`${lineIdx}-${match.index}`} className="font-bold text-white">
            {matchStr.slice(2, -2)}
          </strong>
        );
      } else if (matchStr.startsWith('[') && matchStr.includes('](')) {
        const linkMatch = matchStr.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          const rawUrl = linkMatch[2].trim();
          const isSafeUrl = rawUrl.startsWith('https://') || rawUrl.startsWith('http://');
          if (isSafeUrl) {
            tokens.push(
              <a
                key={`${lineIdx}-${match.index}`}
                href={rawUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300 underline font-medium"
              >
                {linkMatch[1]}
              </a>
            );
          } else {
            tokens.push(linkMatch[1]);
          }
        }
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < displayLine.length) {
      tokens.push(displayLine.substring(lastIndex));
    }

    return (
      <div key={lineIdx} className={isBullet ? 'flex items-start gap-1.5 ml-2 my-0.5' : 'min-h-[1.15rem]'}>
        {isBullet && <span className="text-sky-400 select-none">•</span>}
        <span className="leading-relaxed">{tokens.length > 0 ? tokens : ' '}</span>
      </div>
    );
  });
}

/**
 * WelcomeCard — Branded onboarding card shown when chat is empty.
 */
const WelcomeCard: FC = () => (
  <div className="flex flex-col items-center text-center px-4 py-6 space-y-4 animate-fade-in">
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500/25 via-indigo-500/20 to-teal-400/20 border border-sky-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.2)]">
      <Sparkles className="w-6 h-6 text-sky-300" />
    </div>
    <div>
      <h2 className="text-sm font-bold text-white mb-0.5">FloatCompanion</h2>
      <p className="text-[11px] text-slate-400 max-w-[260px] leading-relaxed">
        Your ambient AI copilot. Ask anything, snap your screen, or use zero-token commands below.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-2 w-full max-w-[280px]">
      <div className="p-2 bg-slate-900/70 rounded-xl border border-white/[0.08] text-left">
        <div className="flex items-center gap-1.5 mb-1">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-semibold text-slate-300">Quick Commands</span>
        </div>
        <p className="text-[9px] text-slate-500 leading-relaxed font-tabular">
          <code className="text-sky-400">ram</code> · <code className="text-sky-400">time</code> · <code className="text-sky-400">open vscode</code> · <code className="text-sky-400">help</code>
        </p>
      </div>
      <div className="p-2 bg-slate-900/70 rounded-xl border border-white/[0.08] text-left">
        <div className="flex items-center gap-1.5 mb-1">
          <Keyboard className="w-3 h-3 text-teal-400" />
          <span className="text-[10px] font-semibold text-slate-300">Shortcuts</span>
        </div>
        <p className="text-[9px] text-slate-500 leading-relaxed font-tabular">
          <kbd className="text-sky-400">Ctrl+Shift+E</kbd> Explain<br />
          <kbd className="text-sky-400">Ctrl+Shift+F</kbd> Focus
        </p>
      </div>
    </div>
  </div>
);

/**
 * ChatTab
 * Conversation stream rendering user bubbles, assistant cards, and zero-token deterministic badges.
 */
export const ChatTab: FC<ChatTabProps> = ({
  messages,
  isStreaming,
  streamingContent,
  copiedId,
  onCopyText,
  onTypeText,
  chatBottomRef,
}) => {
  return (
    <section
      role="tabpanel"
      id="panel-chat"
      aria-labelledby="tab-chat"
      className="space-y-3 pb-2 text-sm"
    >
      {/* Branded Onboarding Card for Fresh Sessions */}
      {messages.length === 0 && !isStreaming && <WelcomeCard />}

      {messages.map((msg) => (
        <article
          key={msg.id}
          className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`max-w-[92%] px-3.5 py-2.5 rounded-2xl leading-relaxed text-xs relative group ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-sky-600 via-sky-600 to-indigo-600 text-white rounded-tr-sm shadow-lg shadow-sky-950/40 border border-sky-400/30'
                : 'bg-slate-900/90 text-slate-200 rounded-tl-sm border border-white/10 shadow-md backdrop-blur-md'
            }`}
          >
            <div>{renderFormattedContent(msg.content)}</div>

            {msg.isZeroToken && (
              <div className="mt-1.5 text-[9px] text-emerald-400 font-tabular font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" aria-hidden="true" />
                <span>0-Token Deterministic Intent</span>
              </div>
            )}

            {/* Micro Action Bar */}
            {msg.role === 'assistant' && (
              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center gap-1.5 text-[10px] opacity-75 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onCopyText(msg.content, msg.id)}
                  className="btn-pill-action px-2 py-0.5 rounded-md flex items-center gap-1 text-slate-300 hover:text-white focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:outline-none"
                  title="Copy text"
                  aria-label="Copy message text"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3 h-3" aria-hidden="true" />
                  )}
                  <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => onTypeText(msg.content)}
                  className="btn-pill-action px-2 py-0.5 rounded-md flex items-center gap-1 text-sky-300 hover:text-sky-200 focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:outline-none"
                  title="Type directly into background active window"
                  aria-label="Type message into active background window"
                >
                  <Terminal className="w-3 h-3" aria-hidden="true" />
                  <span>Type in Window</span>
                </button>
              </div>
            )}
          </div>
        </article>
      ))}

      {/* Live Streaming Indicator */}
      {isStreaming && (
        <article className="flex flex-col items-start" aria-live="polite">
          <div className="max-w-[92%] px-3.5 py-2.5 rounded-2xl bg-slate-900/90 text-slate-200 rounded-tl-sm border border-sky-500/40 text-xs shadow-xl backdrop-blur-md">
            <div className="whitespace-pre-wrap">{streamingContent || 'Synthesizing response...'}</div>
            <div className="mt-1.5 text-[10px] text-sky-400 font-tabular flex items-center gap-1.5 animate-pulse">
              <RotateCw className="w-3 h-3 animate-spin" aria-hidden="true" />
              <span>Streaming response...</span>
            </div>
          </div>
        </article>
      )}

      <div ref={chatBottomRef} />
    </section>
  );
};
