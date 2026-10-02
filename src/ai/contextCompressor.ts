import { ChatMessage } from '../store/useAppStore';

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function prepareOptimizedContext(
  messages: ChatMessage[],
  systemPrompt: string = 'You are FloatCompanion, an ultra-fast desktop AI copilot. You assist developers, students, and power users with coding, debugging, system questions, and general knowledge. Rules: (1) Be concise — answer in 2–4 short paragraphs max. (2) Use Markdown: bold for key terms, backticks for code, bullet lists for multi-part answers. (3) Provide runnable code blocks with language tags when relevant. (4) Never apologize or add filler phrases like "Sure!" or "Great question!". (5) If the user\'s question is ambiguous, answer the most likely interpretation and note the alternative.'
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
