import { ChatMessage } from '../store/useAppStore';

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function prepareOptimizedContext(
  messages: ChatMessage[],
  systemPrompt: string = 'You are FloatCompanion, an ultra-fast, direct, and concise desktop AI execution assistant. Give clear, objective answers with practical commands and code blocks when helpful. Avoid pleasantries or filler.'
): PromptMessage[] {
  const result: PromptMessage[] = [{ role: 'system', content: systemPrompt }];

  // Exclude ephemeral zero-token local telemetry turns to conserve LLM context window
  const conversationalMessages = messages.filter((m) => !m.isZeroToken);

  // Retain the last 6 turns in full
  const recentTurns = conversationalMessages.slice(-6);

  // Compress older turns
  const olderTurns = conversationalMessages.slice(0, -6).map((msg) => {
    let content = msg.content;
    if (content.length > 250) {
      content = content.substring(0, 180) + '... [summarized for context]';
    }
    return {
      role: msg.role,
      content,
    };
  });

  for (const turn of olderTurns) {
    result.push({ role: turn.role, content: turn.content });
  }

  for (const turn of recentTurns) {
    result.push({ role: turn.role, content: turn.content });
  }

  return result;
}
