const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splash', {
  onStatus: (callback) => {
    if (typeof callback !== 'function') {
      return;
    }
    ipcRenderer.on('splash:status', (_event, text) => callback(String(text || '')));
  },
  onProgress: (callback) => {
    if (typeof callback !== 'function') {
      return;
    }
    ipcRenderer.on('splash:progress', (_event, percent) => callback(Number(percent)));
  }
});
