import { FC, RefObject } from 'react';
import { Copy, Check, Terminal, Zap, RotateCw } from 'lucide-react';
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
            <div className="whitespace-pre-wrap">{msg.content}</div>

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
              <span>Streaming tokens via Groq...</span>
            </div>
          </div>
        </article>
      )}

      <div ref={chatBottomRef} />
    </section>
  );
};
