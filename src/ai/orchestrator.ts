import { ChatMessage } from '../store/useAppStore';
import { prepareOptimizedContext, PromptMessage } from './contextCompressor';
import { UserSettings } from '../db/indexedDB';

import { getErrorMessage } from '../utils/errorUtils';

export interface ImageAttachment {
  dataUrl: string;
  base64Data: string;
  mimeType: string;
}

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
    callbacks: StreamCallbacks,
    imageAttachment?: ImageAttachment
  ): Promise<void> {
    this.cancelCurrentStream();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const messages = prepareOptimizedContext([...history, { id: 'temp', role: 'user', content: prompt, timestamp: Date.now() }]);

    // Multimodal Vision Route: If image attached, route to Gemini 2.5 Flash
    if (imageAttachment) {
      if (settings.geminiKey?.trim()) {
        try {
          await this.streamGemini(messages, settings.geminiKey.trim(), signal, callbacks, imageAttachment);
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') return;
          callbacks.onError(`Gemini Vision Error: ${getErrorMessage(err)}`);
          return;
        }
      } else {
        callbacks.onError('Screen Vision analysis requires a Gemini API key. Please configure your key in Settings.');
        return;
      }
    }

    const preferred = settings.defaultModel || 'groq';

    const tryGemini = async (): Promise<boolean> => {
      if (!settings.geminiKey?.trim()) return false;
      try {
        await this.streamGemini(messages, settings.geminiKey.trim(), signal, callbacks);
        return true;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        console.warn('Gemini stream failed:', getErrorMessage(err));
        return false;
      }
    };

    const tryGroq = async (): Promise<boolean> => {
      if (!settings.groqKey?.trim()) return false;
      try {
        await this.streamGroq(messages, settings.groqKey.trim(), signal, callbacks);
        return true;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        console.warn('Groq stream failed:', getErrorMessage(err));
        return false;
      }
    };

    const tryOllama = async (): Promise<boolean> => {
      try {
        return await this.streamOllama(messages, signal, callbacks);
      } catch {
        return false;
      }
    };

    // Build priority list respecting user preference
    const providers: Array<{ name: string; fn: () => Promise<boolean> }> = [];
    if (preferred === 'gemini') {
      providers.push({ name: 'Gemini', fn: tryGemini }, { name: 'Groq', fn: tryGroq }, { name: 'Ollama', fn: tryOllama });
    } else if (preferred === 'ollama') {
      providers.push({ name: 'Ollama', fn: tryOllama }, { name: 'Groq', fn: tryGroq }, { name: 'Gemini', fn: tryGemini });
    } else {
      // Default: Groq (Ultra-fast <300ms) -> Gemini -> Ollama
      providers.push({ name: 'Groq', fn: tryGroq }, { name: 'Gemini', fn: tryGemini }, { name: 'Ollama', fn: tryOllama });
    }

    for (const provider of providers) {
      try {
        const success = await provider.fn();
        if (success) return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // No keys configured or all providers failed
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
   * Google Gemini SSE Streaming with Full Conversation History & Secure Headers
   */
  private async streamGemini(
    messages: PromptMessage[],
    apiKey: string,
    signal: AbortSignal,
    callbacks: StreamCallbacks,
    imageAttachment?: ImageAttachment
  ): Promise<void> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse`;

    // Extract system prompt into official Gemini systemInstruction
    const systemMsg = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Build normalized alternating turns for Gemini
    const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [];

    // Strip leading assistant/model turns so conversation strictly begins with a user turn
    let startIndex = conversationMessages.findIndex((m) => m.role === 'user');
    if (startIndex === -1) startIndex = 0;
    const sanitizedMessages = conversationMessages.slice(startIndex);

    sanitizedMessages.forEach((m, index) => {
      const isLast = index === sanitizedMessages.length - 1;
      const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
      const parts: Array<Record<string, unknown>> = [{ text: m.content?.trim() || ' ' }];

      if (isLast && imageAttachment) {
        parts.unshift({
          inlineData: {
            mimeType: imageAttachment.mimeType || 'image/jpeg',
            data: imageAttachment.base64Data,
          },
        });
      }

      // Strictly alternate roles for Gemini API (merge adjacent turns of same role)
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts.push(...parts);
      } else {
        contents.push({ role, parts });
      }
    });

    // Invariant: Gemini API strictly requires that the first turn has role 'user'
    while (contents.length > 0 && contents[0].role === 'model') {
      contents.shift();
    }

    const requestBody: Record<string, unknown> = { contents };
    if (systemMsg?.content?.trim()) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMsg.content.trim() }],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
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
