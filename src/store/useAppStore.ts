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
  selectedSprintDuration: number;
  focusSecondsRemaining: number;
  activeFocusTask: string;
  distractionAlert: { active: boolean; title: string; keyword: string } | null;
  sessionDistractionsCount: number;

  setMode: (mode: 'orb' | 'tray') => void;
  setActiveTab: (tab: 'chat' | 'tasks' | 'stats' | 'focus') => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  addTask: (title: string, durationMins?: number) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  setSelectedDuration: (duration: number) => void;
  startFocus: (durationMins?: number, task?: string) => void;
  stopFocus: () => void;
  tickFocusSeconds: () => boolean;
  setDistractionAlert: (alert: { active: boolean; title: string; keyword: string } | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
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
  selectedSprintDuration: 25,
  focusSecondsRemaining: 25 * 60,
  activeFocusTask: '',
  distractionAlert: null,
  sessionDistractionsCount: 0,

  setMode: (mode) => set({ mode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
  addTask: (title, durationMins = 25) => {
    const clampedDuration = Math.min(240, Math.max(5, Number(durationMins) || 25));
    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          title: title.trim().slice(0, 120),
          completed: false,
          durationMins: clampedDuration,
        },
      ],
    }));
  },
  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),
  setSelectedDuration: (duration) =>
    set({
      selectedSprintDuration: duration,
      focusSecondsRemaining: duration * 60,
    }),
  startFocus: (durationMins, task) => {
    const dur = durationMins ?? get().selectedSprintDuration;
    const taskTitle = task ?? (get().activeFocusTask || `Sprint (${dur}m)`);
    set({
      isFocusing: true,
      selectedSprintDuration: dur,
      focusSecondsRemaining: dur * 60,
      activeFocusTask: taskTitle,
      distractionAlert: null,
      sessionDistractionsCount: 0,
    });
  },
  stopFocus: () =>
    set((state) => ({
      isFocusing: false,
      focusSecondsRemaining: state.selectedSprintDuration * 60,
      distractionAlert: null,
      sessionDistractionsCount: 0,
    })),
  tickFocusSeconds: () => {
    const state = get();
    if (!state.isFocusing) return false;
    if (state.focusSecondsRemaining <= 1) {
      set({
        isFocusing: false,
        focusSecondsRemaining: state.selectedSprintDuration * 60,
      });
      return true; // Finished
    }
    set({ focusSecondsRemaining: state.focusSecondsRemaining - 1 });
    return false;
  },
  setDistractionAlert: (distractionAlert) =>
    set((state) => ({
      distractionAlert,
      sessionDistractionsCount: distractionAlert?.active
        ? state.sessionDistractionsCount + 1
        : state.sessionDistractionsCount,
    })),
}));
