import { ChatMessage } from '../store/useAppStore';
import { prepareOptimizedContext, PromptMessage } from './contextCompressor';
import { UserSettings } from '../db/indexedDB';

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

export class AIOrchestrator {
  private abortController: AbortController | null = null;

  public cancelCurrentStream() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public async streamPrompt(
    prompt: string,
    history: ChatMessage[],
    settings: UserSettings,
    callbacks: StreamCallbacks
  ): Promise<void> {
    this.cancelCurrentStream();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const messages = prepareOptimizedContext([...history, { id: 'temp', role: 'user', content: prompt, timestamp: Date.now() }]);

    // Priority 1: Groq (Ultra-fast <300ms)
    if (settings.groqKey?.trim()) {
      try {
        await this.streamGroq(messages, settings.groqKey.trim(), signal, callbacks);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Groq stream failed or rate-limited, attempting fallback:', err.message);
        // Fallback to Gemini if key available
        if (settings.geminiKey?.trim()) {
          try {
            await this.streamGemini(prompt, settings.geminiKey.trim(), signal, callbacks);
            return;
          } catch (geminiErr: any) {
            console.error('Gemini fallback failed:', geminiErr.message);
          }
        }
        callbacks.onError(`Groq Error: ${err.message}. (Check API key in Settings)`);
        return;
      }
    }

    // Priority 2: Gemini Direct
    if (settings.geminiKey?.trim()) {
      try {
        await this.streamGemini(prompt, settings.geminiKey.trim(), signal, callbacks);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        callbacks.onError(`Gemini Error: ${err.message}. (Check API key in Settings)`);
        return;
      }
    }

    // Priority 3: Local Ollama (Offline)
    try {
      const ollamaSuccess = await this.streamOllama(messages, signal, callbacks);
      if (ollamaSuccess) return;
    } catch {
      // Ollama not running
    }

    // No keys configured
    callbacks.onDone(
      `🔑 **AI Engine Not Configured Yet**\n\nTo activate live AI responses (powered by Groq Llama-3.3 or Google Gemini):\n1. Click the **Settings ⚙️** icon in the header.\n2. Paste your free **Groq API Key** ([console.groq.com](https://console.groq.com)) or **Gemini Key** ([aistudio.google.com](https://aistudio.google.com)).\n\n*Note: Zero-token local commands like \`"time"\`, \`"ram"\`, and \`"open notepad"\` work without any API keys!*`
    );
  }

  /**
   * Groq OpenAI-Compatible Streaming SSE
   */
  private async streamGroq(
    messages: PromptMessage[],
    apiKey: string,
    signal: AbortSignal,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.6,
        max_tokens: 1500,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) throw new Error('No readable response stream received.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.replace('data: ', '').trim();
          if (dataStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              callbacks.onChunk(fullText);
            }
          } catch {
            // Partial JSON chunk
          }
        }
      }
    }

    callbacks.onDone(fullText);
  }

  /**
   * Google Gemini SSE Streaming
   */
  private async streamGemini(
    prompt: string,
    apiKey: string,
    signal: AbortSignal,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
      signal,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `HTTP ${response.status}`);
    }

    if (!response.body) throw new Error('No stream body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.replace('data: ', ''));
            const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (textChunk) {
              fullText += textChunk;
              callbacks.onChunk(fullText);
            }
          } catch {
            // Ignore partial SSE lines
          }
        }
      }
    }

    callbacks.onDone(fullText);
  }

  /**
   * Local Ollama Streaming
   */
  private async streamOllama(
    messages: PromptMessage[],
    signal: AbortSignal,
    callbacks: StreamCallbacks
  ): Promise<boolean> {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok || !response.body) return false;

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const delta = parsed.message?.content || '';
          if (delta) {
            fullText += delta;
            callbacks.onChunk(fullText);
          }
        } catch {
          // ignore
        }
      }
    }

    callbacks.onDone(fullText);
    return true;
  }
}

export const orchestrator = new AIOrchestrator();
