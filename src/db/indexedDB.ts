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
  await set(SETTINGS_KEY, settings);
}

export async function loadSavedMessages(): Promise<ChatMessage[] | null> {
  try {
    return await get<ChatMessage[]>(CHATS_KEY) || null;
  } catch {
    return null;
  }
}

export async function saveMessages(messages: ChatMessage[]): Promise<void> {
  // Save latest 50 messages to keep local store fast
  const trimmed = messages.slice(-50);
  await set(CHATS_KEY, trimmed);
}

export async function loadSavedTasks(): Promise<TaskItem[] | null> {
  try {
    return await get<TaskItem[]>(TASKS_KEY) || null;
  } catch {
    return null;
  }
}

export async function saveTasks(tasks: TaskItem[]): Promise<void> {
  await set(TASKS_KEY, tasks);
}

export async function recordFocusSession(record: FocusSessionRecord): Promise<void> {
  try {
    const history = (await get<FocusSessionRecord[]>(FOCUS_HISTORY_KEY)) || [];
    history.push(record);
    await set(FOCUS_HISTORY_KEY, history.slice(-100)); // keep last 100
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
