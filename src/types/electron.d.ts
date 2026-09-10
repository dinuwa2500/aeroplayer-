export interface ElectronBridge {
  sendWindowAction?: (action: 'minimize' | 'maximize' | 'close') => void;
  openNativeFileDialog?: () => Promise<string | null>;
}

declare global {
  interface Window {
    electron?: ElectronBridge;
  }
}
