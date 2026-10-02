const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    resize: (payload) => ipcRenderer.invoke('window:resize', payload),
    collapse: () => ipcRenderer.invoke('window:collapse'),
    expand: () => ipcRenderer.invoke('window:expand'),
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    setIgnoreMouse: (ignore, forward = false) =>
      ipcRenderer.invoke('window:set-ignore-mouse', { ignore, forward }),
  },
  chat: {
    onInjectPrompt: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('chat:inject-prompt', listener);
      return () => ipcRenderer.removeListener('chat:inject-prompt', listener);
    },
  },
  os: {
    getStats: () => ipcRenderer.invoke('os:get-system-stats'),
    launchApp: (target) => ipcRenderer.invoke('os:launch-app', { target }),
    typeText: (text, delayMs = 150) => ipcRenderer.invoke('os:type-text', { text, delayMs }),
    captureScreen: () => ipcRenderer.invoke('os:capture-screen'),
  },
  focus: {
    startSession: (payload) => ipcRenderer.invoke('focus:start-session', payload),
    stopSession: () => ipcRenderer.invoke('focus:stop-session'),
    onDistractionDetected: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('focus:distraction-detected', listener);
      return () => ipcRenderer.removeListener('focus:distraction-detected', listener);
    },
    onDistractionCleared: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('focus:distraction-cleared', listener);
      return () => ipcRenderer.removeListener('focus:distraction-cleared', listener);
    },
    // Backward compatibility aliases
    start: (durationMinutes, taskTitle) =>
      ipcRenderer.invoke('focus:start-session', { durationMinutes, taskTitle }),
    stop: () => ipcRenderer.invoke('focus:stop-session'),
    onDistraction: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('focus:distraction-detected', listener);
      return () => ipcRenderer.removeListener('focus:distraction-detected', listener);
    },
  },
  store: {
    getSecureKey: (keyName) => ipcRenderer.invoke('store:get-secure-key', { keyName }),
    setSecureKey: (keyName, keyValue) =>
      ipcRenderer.invoke('store:set-secure-key', { keyName, keyValue }),
  },
});
