const { contextBridge, ipcRenderer, webUtils } = require('electron');

function filePathForFile(file) {
  try {
    if (webUtils && typeof webUtils.getPathForFile === 'function') {
      return webUtils.getPathForFile(file) || '';
    }
  } catch {
    // Fall through to the legacy property below.
  }
  return file && typeof file.path === 'string' ? file.path : '';
}

contextBridge.exposeInMainWorld('mardraw', {
  openFile: () => ipcRenderer.invoke('file:open'),
  openDroppedFiles: (paths) => ipcRenderer.invoke('file:open-dropped', paths),
  filePathForFile,
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  saveFileAs: (payload) => ipcRenderer.invoke('file:save-as', payload),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  readImageFile: (filePath) => ipcRenderer.invoke('file:read-image', filePath),
  pickLinkFile: () => ipcRenderer.invoke('file:pick-link'),
  takePendingOpen: () => ipcRenderer.invoke('file:take-pending'),
  openRelative: (payload) => ipcRenderer.invoke('file:open-relative', payload),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  onOpenPath: (callback) => {
    if (typeof callback !== 'function') {
      return;
    }
    ipcRenderer.on('file:open-path', (_event, filePath) => callback(filePath));
  },
  onCloseRequested: (callback) => {
    if (typeof callback !== 'function') {
      return;
    }
    ipcRenderer.on('app:close-requested', () => callback());
  },
  closeApp: () => ipcRenderer.invoke('app:close'),
  cancelAppClose: () => ipcRenderer.invoke('app:close-cancel'),
  askSaveBeforeClose: (payload) => ipcRenderer.invoke('app:ask-save-before-close', payload)
});
