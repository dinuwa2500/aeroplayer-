import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  sendWindowAction: (action: 'minimize' | 'maximize' | 'close') => {
    ipcRenderer.send('window-action', action);
  },
  openNativeFileDialog: async () => {
    return await ipcRenderer.invoke('open-file-dialog');
  },
});
