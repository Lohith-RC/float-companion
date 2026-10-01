import { get, set, del } from 'idb-keyval';
import { ChatMessage, TaskItem } from '../store/useAppStore';

export interface UserSettings {
  groqKey: string;
  geminiKey: string;
  openaiKey: string;
  defaultModel: 'groq' | 'gemini' | 'ollama' | 'openai';
  soundEnabled: boolean;
  distractionBlacklist: string[];
}

export interface FocusSessionRecord {
  id: string;
  taskTitle: string;
  durationMins: number;
  completedAt: number;
  distractionsCaught: number;
}

const SETTINGS_KEY = 'float_companion_settings';
const CHATS_KEY = 'float_companion_chats';
const TASKS_KEY = 'float_companion_tasks';
const FOCUS_HISTORY_KEY = 'float_companion_focus_history';

export const defaultSettings: UserSettings = {
  groqKey: '',
  geminiKey: '',
  openaiKey: '',
  defaultModel: 'groq',
  soundEnabled: true,
  distractionBlacklist: ['youtube', 'netflix', 'reddit', 'twitter', 'x.com', 'instagram', 'twitch', 'tiktok'],
};

/**
 * Validates integrity of a ChatMessage object before database commit.
 */
export function isValidMessage(msg: unknown): msg is ChatMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.content === 'string' &&
    (m.role === 'user' || m.role === 'assistant' || m.role === 'system')
  );
}

/**
 * Validates integrity of a TaskItem object before database commit.
 */
export function isValidTask(task: unknown): task is TaskItem {
  if (!task || typeof task !== 'object') return false;
  const t = task as Record<string, unknown>;
  return typeof t.id === 'string' && typeof t.title === 'string' && typeof t.completed === 'boolean';
}

export async function loadSettings(): Promise<UserSettings> {
  try {
    const saved = await get<UserSettings>(SETTINGS_KEY);
    return { ...defaultSettings, ...(saved || {}) };
  } catch (err) {
    console.error('Failed to load settings from IndexedDB:', err);
    return defaultSettings;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  // Defensive validation
  const sanitized: UserSettings = {
    groqKey: typeof settings.groqKey === 'string' ? settings.groqKey.trim() : '',
    geminiKey: typeof settings.geminiKey === 'string' ? settings.geminiKey.trim() : '',
    openaiKey: typeof settings.openaiKey === 'string' ? settings.openaiKey.trim() : '',
    defaultModel: settings.defaultModel || 'groq',
    soundEnabled: Boolean(settings.soundEnabled),
    distractionBlacklist: Array.isArray(settings.distractionBlacklist)
      ? settings.distractionBlacklist.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
      : defaultSettings.distractionBlacklist,
  };
  await set(SETTINGS_KEY, sanitized);
}

export async function loadSavedMessages(): Promise<ChatMessage[] | null> {
  try {
    const raw = await get<ChatMessage[]>(CHATS_KEY);
    if (!Array.isArray(raw)) return null;
    return raw.filter(isValidMessage);
  } catch {
    return null;
  }
}

export async function saveMessages(messages: ChatMessage[]): Promise<void> {
  // Defensive integrity filter & bounded LRU slice
  const sanitized = messages.filter(isValidMessage).slice(-100);
  await set(CHATS_KEY, sanitized);
}

export async function loadSavedTasks(): Promise<TaskItem[] | null> {
  try {
    const raw = await get<TaskItem[]>(TASKS_KEY);
    if (!Array.isArray(raw)) return null;
    return raw.filter(isValidTask);
  } catch {
    return null;
  }
}

export async function saveTasks(tasks: TaskItem[]): Promise<void> {
  const sanitized = tasks.filter(isValidTask).slice(-200);
  await set(TASKS_KEY, sanitized);
}

export async function recordFocusSession(record: FocusSessionRecord): Promise<void> {
  try {
    const history = (await get<FocusSessionRecord[]>(FOCUS_HISTORY_KEY)) || [];
    history.push(record);
    await set(FOCUS_HISTORY_KEY, history.slice(-100)); // keep last 100 sessions
  } catch (err) {
    console.error('Failed to record focus session:', err);
  }
}

export async function getFocusHistory(): Promise<FocusSessionRecord[]> {
  try {
    return (await get<FocusSessionRecord[]>(FOCUS_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export async function purgeAllData(): Promise<void> {
  await del(SETTINGS_KEY);
  await del(CHATS_KEY);
  await del(TASKS_KEY);
  await del(FOCUS_HISTORY_KEY);
}
