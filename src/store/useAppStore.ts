import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isZeroToken?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  durationMins: number;
}

interface AppState {
  mode: 'orb' | 'tray';
  activeTab: 'chat' | 'tasks' | 'stats' | 'focus';
  messages: ChatMessage[];
  tasks: TaskItem[];
  isFocusing: boolean;
  focusMinutesRemaining: number;
  activeFocusTask: string;
  distractionAlert: { active: boolean; title: string; keyword: string } | null;

  setMode: (mode: 'orb' | 'tray') => void;
  setActiveTab: (tab: 'chat' | 'tasks' | 'stats' | 'focus') => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  addTask: (title: string, durationMins?: number) => void;
  toggleTask: (id: string) => void;
  setFocusing: (isFocusing: boolean, task?: string, duration?: number) => void;
  setDistractionAlert: (alert: { active: boolean; title: string; keyword: string } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'orb',
  activeTab: 'chat',
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 **FloatCompanion is online.**\n\nTry asking me:\n- `"what time is it"` *(0-token local)*\n- `"how much RAM is in use"` *(native OS stats)*\n- `"open notepad"` or `"launch vscode"` *(instant launch)*\n\nOr click the tabs above for **Focus Mode** and **Tasks**.',
      timestamp: Date.now(),
      isZeroToken: true,
    },
  ],
  tasks: [
    { id: '1', title: 'Complete Project Architecture', completed: true, durationMins: 30 },
    { id: '2', title: 'Implement FastRouter Engine', completed: false, durationMins: 25 },
    { id: '3', title: 'Test Global Summon Hotkey', completed: false, durationMins: 15 },
  ],
  isFocusing: false,
  focusMinutesRemaining: 25,
  activeFocusTask: '',
  distractionAlert: null,

  setMode: (mode) => set({ mode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
  addTask: (title, durationMins = 25) =>
    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          id: Date.now().toString(),
          title,
          completed: false,
          durationMins,
        },
      ],
    })),
  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    })),
  setFocusing: (isFocusing, task = '', duration = 25) =>
    set({
      isFocusing,
      activeFocusTask: task,
      focusMinutesRemaining: duration,
      distractionAlert: null,
    }),
  setDistractionAlert: (distractionAlert) => set({ distractionAlert }),
}));
