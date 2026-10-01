import { useEffect, useState, lazy, Suspense } from 'react';
import { useAppStore } from './store/useAppStore';
import { FloatingOrb } from './components/FloatingOrb';
import { ExpandedTray } from './components/ExpandedTray';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastContainer } from './components/common/ToastContainer';
import { sounds } from './services/soundEffects';
import { loadSavedMessages, loadSavedTasks } from './db/indexedDB';
import { DistractionEvent } from './types/electron';

// Code-split heavy full-screen canvas overlay
const ScreenCanvas = lazy(() =>
  import('./components/ScreenCanvas').then((mod) => ({ default: mod.ScreenCanvas }))
);

export default function App() {
  const { mode, setMode, setDistractionAlert, setFocusing, isFocusing } = useAppStore();
  const [canvasActive, setCanvasActive] = useState(false);

  // Restore messages and tasks from local IndexedDB on startup
  useEffect(() => {
    loadSavedMessages().then((msgs) => {
      if (msgs && msgs.length > 0) {
        useAppStore.setState({ messages: msgs });
      }
    });

    loadSavedTasks().then((savedTasks) => {
      if (savedTasks && savedTasks.length > 0) {
        useAppStore.setState({ tasks: savedTasks });
      }
    });
  }, []);

  // Listen to IPC mode changes and distraction events
  useEffect(() => {
    let unsubscribeDistraction: (() => void) | undefined;
    if (window.electronAPI?.focus?.onDistraction) {
      unsubscribeDistraction = window.electronAPI.focus.onDistraction((data: DistractionEvent) => {
        sounds.playAlert();
        setDistractionAlert({
          active: true,
          title: data.windowTitle,
          keyword: data.matchedRule || 'Distraction',
        });
      });
    }

    // Global in-app shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (canvasActive) {
          handleCloseCanvas();
        } else if (mode === 'tray') {
          handleCollapse();
        }
      }

      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        if (canvasActive) {
          handleCloseCanvas();
        } else {
          handleOpenCanvas();
        }
      }

      if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        if (!isFocusing) {
          setFocusing(true, 'Instant Focus Sprint', 25);
          sounds.playChime();
          window.electronAPI?.focus?.start?.(25, 'Instant Focus Sprint');
        } else {
          setFocusing(false);
          window.electronAPI?.focus?.stop?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribeDistraction?.();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, canvasActive, isFocusing, setDistractionAlert, setFocusing]);

  const handleExpand = async () => {
    setMode('tray');
    sounds.playClick();
    if (window.electronAPI?.window?.expand) {
      await window.electronAPI.window.expand();
    }
  };

  const handleCollapse = async () => {
    setMode('orb');
    sounds.playClick();
    if (window.electronAPI?.window?.collapse) {
      await window.electronAPI.window.collapse();
    }
  };

  const handleOpenCanvas = async () => {
    setCanvasActive(true);
    sounds.playChime();
    if (window.electronAPI?.window?.resize) {
      await window.electronAPI.window.resize({ mode: 'canvas', width: screen.width, height: screen.height });
    }
  };

  const handleCloseCanvas = async () => {
    setCanvasActive(false);
    if (mode === 'tray') {
      await handleExpand();
    } else {
      await handleCollapse();
    }
  };

  return (
    <ErrorBoundary>
      <main className="w-screen h-screen flex items-center justify-center p-0.5 select-none bg-transparent">
        {canvasActive && (
          <Suspense fallback={<div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />}>
            <ScreenCanvas onClose={handleCloseCanvas} />
          </Suspense>
        )}

        {mode === 'orb' ? (
          <FloatingOrb onExpand={handleExpand} />
        ) : (
          <ExpandedTray onCollapse={handleCollapse} onOpenCanvas={handleOpenCanvas} />
        )}

        <ToastContainer />
      </main>
    </ErrorBoundary>
  );
}
