const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  onConfirmQuit: (callback) => {
    ipcRenderer.on('app:confirm-quit', () => callback());
  },
  quitConfirmed: () => ipcRenderer.send('app:quit-confirmed'),
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowToggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window:maximized-changed', (_event, value) => callback(value));
  },
});
