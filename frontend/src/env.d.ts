/// <reference types="vite/client" />

interface ElectronAPI {
  platform: string;
  onConfirmQuit: (callback: () => void) => void;
  quitConfirmed: () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
