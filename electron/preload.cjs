const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    resize: (mode, width, height) => ipcRenderer.invoke('window:resize', { mode, width, height }),
    collapse: () => ipcRenderer.invoke('window:collapse'),
    expand: () => ipcRenderer.invoke('window:expand'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    setIgnoreMouse: (ignore) => ipcRenderer.invoke('window:set-ignore-mouse', { ignore }),
  },
  os: {
    getStats: () => ipcRenderer.invoke('os:get-stats'),
    launchApp: (appName) => ipcRenderer.invoke('os:launch-app', { appName }),
    typeText: (text) => ipcRenderer.invoke('os:type-text', { text }),
  },
  focus: {
    start: (durationMins, task) => ipcRenderer.invoke('focus:start', { durationMins, task }),
    stop: () => ipcRenderer.invoke('focus:stop'),
    onDistraction: (callback) => {
      const subscription = (_event, data) => callback(data);
      ipcRenderer.on('focus:distraction', subscription);
      return () => ipcRenderer.removeListener('focus:distraction', subscription);
    },
  },
});
