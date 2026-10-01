# Memory Subsystem & Habit Analytics — FloatCompanion

**Document Version:** 1.0.0  
**Scope:** Episodic Memory, Context Compression, Long-Term Persistence & Habit Telemetry  

---

## 1. Memory Tier Hierarchy

FloatCompanion employs a 3-tier memory model designed to minimize token costs while maintaining long-term conversational continuity across desktop sessions:

```mermaid
graph TD
    Input[Incoming Prompt] --> WorkingMemory[Tier 1: Active Working Memory (RAM / Zustand)]
    WorkingMemory --> ContextPruner[Adaptive Context Compressor]
    ContextPruner --> LLM[LLM Context Capsule]
    
    WorkingMemory --> LocalStore[Tier 2: Episodic Memory (Local IndexedDB)]
    LocalStore --> HabitEngine[Tier 3: Habit Mining & Long-Term Memory]
    HabitEngine --> LocalStore
```

---

## 2. Memory Tiers Explained

### Tier 1: Active Working Memory (Ephemeral / In-Session)
* **Storage Location:** Zustand state in React Renderer process.
* **Scope:** The active conversational turn sequence.
* **Eviction Policy:** When a session is concluded or cleared, working memory is flushed to IndexedDB and reset to an empty state.

### Tier 2: Episodic Memory (Persistent / Local-First)
* **Storage Location:** IndexedDB (`idb-keyval`).
* **Schema:**
```typescript
interface ChatSession {
  id: string; // UUID v4
  title: string; // Auto-generated summary of session
  createdAt: number;
  updatedAt: number;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    tokensUsed?: number;
    actionsTaken?: string[];
  }>;
}
```
* **Isolation Rule:** Transcripts created on the desktop never overwrite web playground sessions; each device maintains an independent transcript log.

### Tier 3: Habit Mining & Focus Telemetry
* Records anonymous, local-only productivity telemetry:
  * Number of completed 25-minute Pomodoro sprints.
  * Frequent distraction triggers (e.g. *"YouTube opened 4 times during morning sprints"*).
  * Peak focus hours throughout the week.
* Provides inputs to the self-healing sprint planner to suggest realistic task estimations.

---

## 3. Context Capsule Compression (Token Optimization)

Sending an entire 50-turn conversation history to an LLM wastes money and degrades reasoning speed. FloatCompanion applies strict context pruning:

```typescript
// contextCompressor.ts
export function compressContext(messages: ChatMessage[], maxTokens: number = 4000): ChatMessage[] {
  // 1. Always retain System Prompt at Index 0
  const systemPrompt = messages[0];
  
  // 2. Retain the most recent 6 conversational turns in full
  const recentTurns = messages.slice(-6);
  
  // 3. For older turns: strip base64 images and collapse lengthy tool outputs
  const historicalTurns = messages.slice(1, -6).map(msg => {
    if (msg.content.length > 300) {
      return {
        ...msg,
        content: msg.content.substring(0, 200) + '... [Historical summary truncated]'
      };
    }
    return msg;
  });

  return [systemPrompt, ...historicalTurns, ...recentTurns];
}
```

---

## 4. Privacy & Data Boundaries

1. **Zero Cloud Leaks:** Raw conversational memories and OS telemetry are never sent to external servers or telemetry trackers.
2. **One-Click Memory Purge:** The user can instantly erase all historical chats and habit logs from Settings (`Delete All Memory`).
3. **API Key Isolation:** API credentials are never injected into LLM chat context payloads.
