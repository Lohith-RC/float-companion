import { FC } from 'react';
import { useToastStore, ToastItem } from '../../store/useToastStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const renderIcon = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />;
      default:
        return <Info className="w-4 h-4 text-sky-400 flex-shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[9999] pointer-events-none flex flex-col gap-2 items-center"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto max-w-sm w-full bg-slate-950/95 border border-white/15 px-3 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2.5 text-xs text-slate-200 animate-slide-up select-none"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {renderIcon(toast.type)}
            <span className="truncate leading-tight font-medium">{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
