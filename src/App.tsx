import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { FloatingOrb } from './components/FloatingOrb';
import { ExpandedTray } from './components/ExpandedTray';

export default function App() {
  const { mode, setMode, setDistractionAlert } = useAppStore();

  // Listen to IPC mode changes and distraction events
  useEffect(() => {
    // 1. Listen for distraction alerts
    let unsubscribeDistraction: (() => void) | undefined;
    if (window.electronAPI?.focus?.onDistraction) {
      unsubscribeDistraction = window.electronAPI.focus.onDistraction((data) => {
        setDistractionAlert({
          active: true,
          title: data.windowTitle,
          keyword: data.matchedKeyword,
        });
      });
    }

    // 2. Global Escape key to collapse
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'tray') {
        handleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribeDistraction?.();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode]);

  const handleExpand = async () => {
    setMode('tray');
    if (window.electronAPI?.window?.expand) {
      await window.electronAPI.window.expand();
    }
  };

  const handleCollapse = async () => {
    setMode('orb');
    if (window.electronAPI?.window?.collapse) {
      await window.electronAPI.window.collapse();
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center p-0.5 select-none bg-transparent">
      {mode === 'orb' ? (
        <FloatingOrb onExpand={handleExpand} />
      ) : (
        <ExpandedTray onCollapse={handleCollapse} />
      )}
    </div>
  );
}
