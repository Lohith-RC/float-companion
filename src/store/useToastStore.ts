import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  durationMs?: number;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', durationMs?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, type = 'info', durationMs = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, durationMs }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, durationMs);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
